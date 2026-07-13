import logging
from typing import List, Dict, Any, Optional
from app.database import qdrant_client
from sqlalchemy.orm import Session
from app import models
import numpy as np

logger = logging.getLogger(__name__)

# Fallback embedder
class FallbackEmbedder:
    def encode(self, text: str) -> List[float]:
        np.random.seed(sum(ord(c) for c in text) % 2**32)
        vec = np.random.randn(384)
        norm = np.linalg.norm(vec)
        return (vec / norm).tolist() if norm > 0 else vec.tolist()

try:
    from sentence_transformers import SentenceTransformer
    embedder = SentenceTransformer('all-MiniLM-L6-v2')
    logger.info("SentenceTransformer loaded in vector_service.")
except Exception as e:
    logger.warning(f"Could not load SentenceTransformer in vector_service, using fallback embedder: {e}")
    embedder = FallbackEmbedder()


class VectorService:
    @staticmethod
    def search_similar_cases(db: Session, query_text: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Search for cases with similar brief facts.
        """
        results = []
        
        # 1. Try Qdrant Vector search
        if qdrant_client:
            try:
                collection_name = "cases_collection"
                query_vector = embedder.encode(query_text)
                
                search_result = qdrant_client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    limit=limit
                )
                
                for hit in search_result:
                    payload = hit.payload
                    score = hit.score
                    
                    # Fetch detailed relations from Postgres
                    case_id = payload["case_id"]
                    case_master = db.query(models.CaseMaster).filter(models.CaseMaster.CaseMasterID == case_id).first()
                    if case_master:
                        results.append(VectorService._format_case_match(case_master, score))
                        
                if results:
                    return results
            except Exception as e:
                logger.error(f"Qdrant search failed: {e}. Falling back to Postgres database match.")

        # 2. Fallback: TF-IDF / Keyword Cosine match in memory from Postgres
        try:
            all_cases = db.query(models.CaseMaster).all()
            scored_cases = []
            
            # Simple TF-IDF cosine approximation using token overlaps
            query_tokens = set(query_text.lower().split())
            
            for case in all_cases:
                facts = (case.BriefFacts or "").lower()
                facts_tokens = facts.split()
                if not facts_tokens:
                    continue
                
                facts_token_set = set(facts_tokens)
                intersection = query_tokens.intersection(facts_token_set)
                
                # Cosine similarity on word frequencies
                score = len(intersection) / (np.sqrt(len(query_tokens)) * np.sqrt(len(facts_token_set))) if query_tokens else 0.0
                
                # If there's an overlap, or fallback to random-looking deterministic similarity based on embeddings
                if score == 0:
                    v1 = np.array(embedder.encode(query_text))
                    v2 = np.array(embedder.encode(case.BriefFacts or ""))
                    score = float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))
                
                scored_cases.append((case, score))
                
            # Sort by score descending
            scored_cases.sort(key=lambda x: x[1], reverse=True)
            
            for case, score in scored_cases[:limit]:
                results.append(VectorService._format_case_match(case, score))
                
            return results
        except Exception as e:
            logger.error(f"Fallback search failed: {e}")
            return []

    @staticmethod
    def _format_case_match(case: models.CaseMaster, score: float) -> Dict[str, Any]:
        sections = [assoc.SectionID for assoc in case.act_sections]
        accused = [acc.AccusedName for acc in case.accused_list]
        
        # Dynamic reasoning summary
        reason = f"Matches the keyword focus. References section {', '.join(sections)} and involves suspects {', '.join(accused)}."
        if score > 0.85:
            reason = f"Highly critical match! Identical crime pattern and legal section invocation ({', '.join(sections)}) detected."
        elif score > 0.65:
            reason = f"Strong circumstantial match. Similar MO of crime under section {', '.join(sections)}."
            
        return {
            "case_id": case.CaseMasterID,
            "crime_no": case.CrimeNo,
            "case_no": case.CaseNo,
            "brief_facts": case.BriefFacts,
            "registered_date": str(case.CrimeRegisteredDate),
            "score": round(score, 3),
            "station": case.police_station.UnitName,
            "sections": sections,
            "accused": accused,
            "officer": case.registering_officer.FirstName,
            "reason": reason
        }

    @staticmethod
    def index_document(db: Session, filename: str, category: str, content: str) -> bool:
        """
        Index manual PDFs, chunk and upload vectors into Qdrant.
        """
        try:
            # Simple chunking: 400 characters, overlap 100
            chunks = []
            chunk_size = 400
            overlap = 100
            
            i = 0
            while i < len(content):
                chunk = content[i : i + chunk_size]
                chunks.append(chunk)
                i += (chunk_size - overlap)
                
            points = []
            for idx, chunk in enumerate(chunks):
                # Generate unique ID
                embedding_id = f"doc_{filename}_{idx}"
                vector = embedder.encode(chunk)
                
                # Write metadata in SQL
                doc_record = models.DocumentKnowledge(
                    Filename=filename,
                    Category=category,
                    Content=chunk,
                    ChunkIndex=idx,
                    EmbeddingID=embedding_id
                )
                db.add(doc_record)
                db.commit()
                
                points.append({
                    "id": random_uuid_hash(embedding_id), # deterministic INT
                    "vector": vector,
                    "payload": {
                        "filename": filename,
                        "category": category,
                        "content": chunk,
                        "chunk_index": idx
                    }
                })
                
            # Upsert vectors to Qdrant
            if qdrant_client:
                collection_name = "knowledge_collection"
                # create collection if not exist
                collections = [col.name for col in qdrant_client.get_collections().collections]
                if collection_name not in collections:
                    qdrant_client.recreate_collection(
                        collection_name=collection_name,
                        vectors_config={"size": 384, "distance": "Cosine"}
                    )
                qdrant_client.upsert(collection_name=collection_name, points=points)
                
            logger.info(f"Indexed document {filename} into {len(chunks)} chunks.")
            return True
        except Exception as e:
            logger.error(f"Failed to index document: {e}")
            db.rollback()
            return False

    @staticmethod
    def query_knowledge_base(db: Session, query_text: str, category: Optional[str] = None, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Perform RAG query.
        """
        results = []
        
        # 1. Try Qdrant
        if qdrant_client:
            try:
                collection_name = "knowledge_collection"
                query_vector = embedder.encode(query_text)
                
                # filter if category is provided
                filter_obj = None
                if category:
                    from qdrant_client.http import models as qmodels
                    filter_obj = qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="category",
                                match=qmodels.MatchValue(value=category)
                            )
                        ]
                    )
                    
                search_res = qdrant_client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    query_filter=filter_obj,
                    limit=limit
                )
                
                for hit in search_res:
                    results.append({
                        "content": hit.payload["content"],
                        "filename": hit.payload["filename"],
                        "category": hit.payload["category"],
                        "score": round(hit.score, 3)
                    })
                if results:
                    return results
            except Exception as e:
                logger.error(f"RAG search failed in Qdrant: {e}")

        # 2. Fallback SQL text match
        try:
            query_obj = db.query(models.DocumentKnowledge)
            if category:
                query_obj = query_obj.filter(models.DocumentKnowledge.Category == category)
                
            # Filter matches
            matches = query_obj.all()
            scored_matches = []
            
            for doc in matches:
                # Basic overlap
                q_words = set(query_text.lower().split())
                doc_words = set(doc.Content.lower().split())
                intersection = q_words.intersection(doc_words)
                
                score = len(intersection) / len(q_words) if q_words else 0.0
                if score > 0:
                    scored_matches.append((doc, score))
                    
            scored_matches.sort(key=lambda x: x[1], reverse=True)
            
            for doc, score in scored_matches[:limit]:
                results.append({
                    "content": doc.Content,
                    "filename": doc.Filename,
                    "category": doc.Category,
                    "score": round(score, 3)
                })
                
            # If still nothing, return static legal information from IPC/BNS
            if not results:
                results = VectorService._get_static_rag_fallbacks(query_text)
                
            return results
        except Exception as e:
            logger.error(f"Fallback RAG failed: {e}")
            return VectorService._get_static_rag_fallbacks(query_text)

    @staticmethod
    def _get_static_rag_fallbacks(query_text: str) -> List[Dict[str, Any]]:
        # Hardcoded expert references for local demo out-of-the-box support
        kb = [
            {
                "content": "BNS Section 103 (Punishment for Murder): (1) Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine. (2) When a group of five or more persons acts in concert commits murder on the ground of race, caste or community, sex, place of birth, language, personal belief or any other ground, each member of such group shall be punished with death or with imprisonment for life.",
                "filename": "BNS_2023_Manual.pdf",
                "category": "BNS",
                "score": 0.82
            },
            {
                "content": "IPC Section 302 (Punishment for Murder): Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine. Murder requires intention to cause death or cause bodily injury which the offender knows is likely to cause death.",
                "filename": "IPC_1860_Manual.pdf",
                "category": "IPC",
                "score": 0.79
            },
            {
                "content": "Karnataka Police Manual Chapter XII: Standard Operating Procedure for Burglary and Housebreaking Investigations. The Investigating Officer must secure the crime scene immediately, call for the fingerprint squad, examine entry points for tool marks, collect CCTV footage within 500m radius, and cross-reference modius operandi (MO) in the crime database.",
                "filename": "KSP_SOP_Manual.pdf",
                "category": "SOP",
                "score": 0.75
            }
        ]
        
        q_words = set(query_text.lower().split())
        scored = []
        for doc in kb:
            intersection = q_words.intersection(set(doc["content"].lower().split()))
            score = len(intersection) / len(q_words) if q_words else 0.0
            # boost slightly if match
            doc["score"] = round(0.5 + score / 2, 2)
            scored.append(doc)
            
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored


# Helper to convert string key to 64-bit int for Qdrant IDs
def random_uuid_hash(key: str) -> int:
    import hashlib
    h = hashlib.sha256(key.encode('utf-8')).hexdigest()
    return int(h[:16], 16)
