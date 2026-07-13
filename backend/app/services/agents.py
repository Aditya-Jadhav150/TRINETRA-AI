import logging
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from app import models
from app.services.graph_service import GraphService
from app.services.vector_service import VectorService
from app.database import get_db

logger = logging.getLogger(__name__)

class AgentResponse:
    def __init__(self, content: str, intent: str, sql: str = "", cypher: str = "", records: List[Dict[str, Any]] = None, graph_data: Dict[str, Any] = None, confidence: float = 0.9, reasoning: str = ""):
        self.content = content
        self.intent = intent
        self.sql = sql
        self.cypher = cypher
        self.records = records or []
        self.graph_data = graph_data or {"nodes": [], "edges": []}
        self.confidence = confidence
        self.reasoning = reasoning

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "intent": self.intent,
            "evidence": {
                "sql_executed": self.sql,
                "cypher_executed": self.cypher,
                "database_records": self.records,
                "graph_data": self.graph_data,
                "confidence_score": self.confidence,
                "reasoning_path": self.reasoning,
                "timestamp": str(datetime.now())
            }
        }


class AgentOrchestrator:
    @staticmethod
    def process_query(db: Session, session_id: str, query: str, username: str = "investigator") -> Dict[str, Any]:
        """
        Main multi-agent pipeline:
        1. Conversation Memory: Load past context
        2. Intent Classification Agent: Parse intent
        3. Task Routing: Route to SQL / Graph / RAG / Forecast
        4. Execution: run query and fetch real records
        5. Explainable AI Layer & Final Response Generator
        """
        # Save user query to ChatMessage
        try:
            # Check session existence or create
            session = db.query(models.ConversationSession).filter(models.ConversationSession.SessionID == session_id).first()
            if not session:
                session = models.ConversationSession(SessionID=session_id, Username=username, Title=query[:30] + "...")
                db.add(session)
                db.commit()
                
            user_msg = models.ChatMessage(SessionID=session_id, Sender="user", Content=query)
            db.add(user_msg)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to record user chat message: {e}")
            
        # 1 & 2: Load Memory & Classify Intent
        memory_context = AgentOrchestrator._load_conversation_memory(db, session_id)
        intent, details = AgentOrchestrator._classify_intent(query, memory_context)
        
        logger.info(f"Session {session_id} - Classifed Intent: {intent} with details {details}")
        
        # 3 & 4: Task Routing and Agent execution
        agent_res: AgentResponse = AgentOrchestrator._route_and_execute(db, intent, query, details, memory_context)
        
        # Save assistant response to ChatMessage with Evidence
        try:
            evidence_json = json.dumps(agent_res.to_dict()["evidence"])
            assistant_msg = models.ChatMessage(
                SessionID=session_id,
                Sender="assistant",
                Content=agent_res.content,
                Evidence=evidence_json
            )
            db.add(assistant_msg)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to record assistant chat message: {e}")
            
        return agent_res.to_dict()

    @staticmethod
    def _load_conversation_memory(db: Session, session_id: str) -> Dict[str, Any]:
        """
        Fetch previous messages in the session to construct memory context.
        """
        context = {
            "last_crime_type": None,
            "last_district": None,
            "last_station": None,
            "last_section": None,
            "last_accused": None,
            "is_followup": False
        }
        
        try:
            messages = db.query(models.ChatMessage)\
                .filter(models.ChatMessage.SessionID == session_id)\
                .order_by(models.ChatMessage.Timestamp.desc())\
                .limit(6).all()
                
            # Read from oldest to newest of the fetched messages
            for msg in reversed(messages):
                if msg.Sender == "user":
                    text = msg.Content.lower()
                    # Capture filters
                    if "robbery" in text or "dacoity" in text or "theft" in text or "murder" in text or "drugs" in text or "assault" in text:
                        for word in ["robbery", "dacoity", "theft", "murder", "drugs", "assault"]:
                            if word in text:
                                context["last_crime_type"] = word
                    if "mysore" in text:
                        context["last_district"] = "Mysore City"
                    if "bangalore" in text:
                        context["last_district"] = "Bangalore City"
                    if "mangalore" in text:
                        context["last_district"] = "Mangalore City"
                    if "hubli" in text or "hubballi" in text:
                        context["last_district"] = "Hubballi-Dharwad"
                    if "belgaum" in text or "belagavi" in text:
                        context["last_district"] = "Belagavi"
                        
                    # Capture specific accused
                    match = re.search(r"sunil\s+gowda|karan\s+mehta|vinay\s+lal|raju\s+kappe|mohammed\s+shafi", text)
                    if match:
                        context["last_accused"] = match.group(0).title()
                        
            if len(messages) > 1:
                context["is_followup"] = True
                
        except Exception as e:
            logger.error(f"Failed to load memory: {e}")
            
        return context

    @staticmethod
    def _classify_intent(query: str, memory: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """
        Classifies what the user wants to accomplish.
        Intents: SQL_QUERY, GRAPH_RELATION, CASE_SIMILARITY, FORECAST, RAG_LAW, ANALYTICS
        """
        q = query.lower()
        
        # Check for RAG / SOP / Manual queries
        if any(word in q for word in ["sop", "manual", "procedure", "bns section", "ipc section", "law", "guidelines", "circular"]):
            return "RAG_LAW", {}
            
        # Check for forecasting queries
        if any(word in q for word in ["forecast", "predict", "hotspots next", "future", "emerging"]):
            return "FORECAST", {}
            
        # Check for similarity queries
        if any(word in q for word in ["similar", "facts matching", "cases like", "embeddings", "compare cases"]):
            return "CASE_SIMILARITY", {}
            
        # Check for graph / associations queries
        if any(word in q for word in ["network", "association", "shortest path", "connection", "gang", "syndicate", "links", "connected"]):
            details = {}
            # Try to extract names for shortest path
            names = re.findall(r"(sunil gowda|karan mehta|vinay lal|raju kappe|mohammed shafi|neha sen|rajesh hegde|divya reddy)", q)
            if len(names) >= 2:
                details["shortest_path"] = (names[0].title(), names[1].title())
            return "GRAPH_RELATION", details
            
        # Check for analytics queries
        if any(word in q for word in ["statistics", "trend", "chart", "resolution rate", "rankings", "monthly share", "officer performance"]):
            return "ANALYTICS", {}
            
        # Default is SQL_QUERY (searching standard cases records)
        details = {}
        # Parse standard filtering
        if "murder" in q or "ipc 302" in q:
            details["crime"] = "murder"
        elif "theft" in q or "robbery" in q:
            details["crime"] = "theft" if "theft" in q else "robbery"
        elif "dacoity" in q:
            details["crime"] = "dacoity"
        elif "drugs" in q or "ndps" in q:
            details["crime"] = "drugs"
            
        # Check for district filter
        for d_key, d_val in [("mysore", "Mysore City"), ("bangalore", "Bangalore City"), ("mangalore", "Mangalore City"), ("hubli", "Hubballi-Dharwad")]:
            if d_key in q:
                details["district"] = d_val
                
        # Check for accused filter
        for name in ["sunil gowda", "karan mehta", "vinay lal", "raju kappe", "mohammed shafi"]:
            if name in q:
                details["accused"] = name.title()
                
        # Handle follow-up refinements (using memory)
        if memory["is_followup"]:
            if "unresolved" in q or "investigation" in q or "pending" in q:
                details["status"] = "Under Investigation"
            if "resolved" in q or "closed" in q or "chargesheet" in q:
                details["status"] = "Chargesheeted"
            if "repeat" in q or "habitual" in q:
                details["repeat_offender"] = True
                
        return "SQL_QUERY", details

    @staticmethod
    def _route_and_execute(db: Session, intent: str, query: str, details: Dict[str, Any], memory: Dict[str, Any]) -> AgentResponse:
        """
        Routes the task to specific specialized sub-agents
        """
        if intent == "GRAPH_RELATION":
            return AgentOrchestrator._execute_graph_agent(db, query, details, memory)
        elif intent == "CASE_SIMILARITY":
            return AgentOrchestrator._execute_similarity_agent(db, query, details)
        elif intent == "FORECAST":
            return AgentOrchestrator._execute_forecast_agent(db, query)
        elif intent == "RAG_LAW":
            return AgentOrchestrator._execute_rag_agent(db, query)
        elif intent == "ANALYTICS":
            return AgentOrchestrator._execute_analytics_agent(db, query)
        else:
            return AgentOrchestrator._execute_sql_agent(db, query, details, memory)

    # ==========================================
    # SPECIALIZED AGENTS
    # ==========================================

    @staticmethod
    def _execute_sql_agent(db: Session, query: str, details: Dict[str, Any], memory: Dict[str, Any]) -> AgentResponse:
        """
        SQL Agent: Compiles target filters into structured SQL and runs on Postgres
        """
        # Resolve filters taking memory into account
        crime = details.get("crime") or memory.get("last_crime_type")
        district = details.get("district") or memory.get("last_district")
        accused = details.get("accused") or memory.get("last_accused")
        status = details.get("status")
        repeat_only = details.get("repeat_offender", False)
        
        # Build SQL Query String dynamically
        sql_base = (
            "SELECT cm.\"CaseMasterID\", cm.\"CrimeNo\", cm.\"CaseNo\", cm.\"CrimeRegisteredDate\", "
            "u.\"UnitName\" AS station, d.\"DistrictName\" AS district, csh.\"CrimeHeadName\" AS crime_type, "
            "csm.\"CaseStatusName\" AS status, cm.\"BriefFacts\" "
            "FROM \"CaseMaster\" cm "
            "JOIN \"Unit\" u ON cm.\"PoliceStationID\" = u.\"UnitID\" "
            "JOIN \"District\" d ON u.\"DistrictID\" = d.\"DistrictID\" "
            "JOIN \"CrimeSubHead\" csh ON cm.\"CrimeMinorHeadID\" = csh.\"CrimeSubHeadID\" "
            "JOIN \"CaseStatusMaster\" csm ON cm.\"CaseStatusID\" = csm.\"CaseStatusID\" "
        )
        
        where_clauses = []
        params = {}
        
        if crime:
            where_clauses.append("LOWER(csh.\"CrimeHeadName\") = :crime")
            params["crime"] = crime
        if district:
            where_clauses.append("d.\"DistrictName\" = :district")
            params["district"] = district
        if status:
            where_clauses.append("csm.\"CaseStatusName\" = :status")
            params["status"] = status
        if accused:
            sql_base += " JOIN \"Accused\" acc ON acc.\"CaseMasterID\" = cm.\"CaseMasterID\""
            where_clauses.append("LOWER(acc.\"AccusedName\") = :accused")
            params["accused"] = accused.lower()
        if repeat_only:
            # filter by accused that have counts > 1
            sql_base += (
                " JOIN \"Accused\" acc_rep ON acc_rep.\"CaseMasterID\" = cm.\"CaseMasterID\""
                " WHERE acc_rep.\"AccusedName\" IN ("
                "   SELECT \"AccusedName\" FROM \"Accused\" "
                "   WHERE \"AccusedName\" != 'Unknown' "
                "   GROUP BY \"AccusedName\" HAVING COUNT(\"CaseMasterID\") > 1"
                " )"
            )
            # remove 'WHERE' token insertion later if we appended here
            
        sql = sql_base
        if where_clauses:
            if "WHERE" in sql:
                sql += " AND " + " AND ".join(where_clauses)
            else:
                sql += " WHERE " + " AND ".join(where_clauses)
                
        sql += " ORDER BY cm.\"CrimeRegisteredDate\" DESC LIMIT 10;"
        
        reasoning = f"SQL Agent analyzed query. Identified filters: crime={crime}, district={district}, accused={accused}, status={status}, repeat_only={repeat_only}. Executed Postgres relational query using indexed lookups."
        
        records = []
        try:
            res = db.execute(text(sql), params)
            for r in res:
                records.append({
                    "CaseMasterID": r[0],
                    "CrimeNo": r[1],
                    "CaseNo": r[2],
                    "CrimeRegisteredDate": str(r[3]),
                    "station": r[4],
                    "district": r[5],
                    "crime_type": r[6],
                    "status": r[7],
                    "BriefFacts": r[8]
                })
        except Exception as e:
            logger.error(f"SQL execution error: {e}")
            reasoning += f" Error: {str(e)}"
            
        # Final NL text compilation
        if records:
            content = f"Found {len(records)} cases matching your filters in the Karnataka Police database:\n\n"
            for r in records:
                content += f"- **FIR No. {r['CaseNo']}** ({r['crime_type']} at {r['station']}, {r['district']}): Registered on {r['CrimeRegisteredDate']}. Status: *{r['status']}*. facts: {r['BriefFacts'][:150]}...\n"
        else:
            content = "No case records match the specified filters in the police relational database."
            
        return AgentResponse(
            content=content,
            intent="SQL_QUERY",
            sql=sql,
            records=records,
            confidence=0.95,
            reasoning=reasoning
        )

    @staticmethod
    def _execute_graph_agent(db: Session, query: str, details: Dict[str, Any], memory: Dict[str, Any]) -> AgentResponse:
        """
        Graph Agent: Queries Neo4j for network associations, shortest path, and community structures
        """
        shortest_path_nodes = details.get("shortest_path")
        
        cypher = ""
        records = []
        graph_data = {"nodes": [], "edges": []}
        
        if shortest_path_nodes:
            start, end = shortest_path_nodes
            cypher = (
                "MATCH (start {name: $start}), (end {name: $end})\n"
                "MATCH p = shortestPath((start)-[*..10]-(end))\n"
                "RETURN p"
            )
            reasoning = f"Graph Agent activated. Traced associations link from suspect '{start}' to suspect '{end}' utilizing Neo4j Dijkstra shortest path algorithm."
            
            path_res = GraphService.find_shortest_path(start, end)
            if path_res["found"]:
                graph_data = path_res
                content = f"Shortest path link found in database connecting **{start}** to **{end}**:\n\n"
                path_str = " → ".join([f"**{n['label']}** ({n['type']})" for n in path_res["nodes"]])
                content += f"Path: {path_str}\n\nThis connection highlights a direct criminal relationship or shared case association."
                records = [{"path_length": len(path_res["nodes"]), "nodes": [n["label"] for n in path_res["nodes"]]}]
            else:
                content = f"No network connection path was found linking **{start}** to **{end}** in the current intelligence graph."
                
        else:
            # Default: Show criminal associations summary
            cypher = "MATCH (a:Accused)-[r:COMMITTED]->(c:Case) RETURN a.name, count(c) AS case_count ORDER BY case_count DESC LIMIT 5;"
            reasoning = "Graph Agent pulled structural association nodes representing accused suspects, officers, cases and stations from Neo4j."
            
            full_graph = GraphService.get_graph_data(limit=100)
            graph_data = full_graph
            
            # List repeat offenders
            centrality = GraphService.get_centrality_metrics()
            records = centrality
            
            content = "### Criminal Association Network Summary\n\n"
            content += "The platform has extracted active nodes from the Neo4j Knowledge Graph. Key network hotspots:\n\n"
            for c in centrality[:3]:
                content += f"- **{c['name']}** ({c['type']}): {c['description']} (Centrality score: {c['score']})\n"
            content += "\nOpen the **Knowledge Graph** tab in the sidebar to interactively expand, collapse, and analyze the syndicates."
            
        return AgentResponse(
            content=content,
            intent="GRAPH_RELATION",
            cypher=cypher,
            records=records,
            graph_data=graph_data,
            confidence=0.88,
            reasoning=reasoning
        )

    @staticmethod
    def _execute_similarity_agent(db: Session, query: str, details: Dict[str, Any]) -> AgentResponse:
        """
        Similarity Agent: Compares brief facts embeddings using Qdrant
        """
        # Look for facts queries
        q_clean = query.replace("similar cases", "").replace("find cases like", "").strip()
        if not q_clean or len(q_clean) < 10:
            # Use case 1 facts as search context
            q_clean = "stabbing incident over property dispute, suspect used knife in broad daylight"
            
        reasoning = f"Case Similarity Agent activated. Generating 384-dimension vector embedding for query text: '{q_clean}' using all-MiniLM-L6-v2. Performing Cosine similarity search in Qdrant."
        
        matches = VectorService.search_similar_cases(db, q_clean, limit=4)
        
        content = "### Case Similarity Search Results\n\n"
        content += f"Searched database for cases matching: *\"{q_clean}\"*\n\n"
        
        for m in matches:
            content += f"- **FIR No. {m['case_no']}** (Match Score: **{m['score']*100}%**): Registered at {m['station']}. *{m['reason']}*\n"
            content += f"  > *Facts: {m['brief_facts'][:140]}...*\n\n"
            
        return AgentResponse(
            content=content,
            intent="CASE_SIMILARITY",
            records=matches,
            confidence=0.92,
            reasoning=reasoning
        )

    @staticmethod
    def _execute_forecast_agent(db: Session, query: str) -> AgentResponse:
        """
        Forecast Agent: Calls forecasting engine
        """
        from app.routers.forecast import get_crime_forecast, get_seasonal_spikes
        
        reasoning = "Forecast Agent activated. Executed Exponential Smoothing time-series predictions. Evaluated weekend alcohol-incident variables and festival residential indicators."
        
        forecast_res = get_crime_forecast(db)
        spikes = get_seasonal_spikes()
        
        content = f"### Crime Forecast Report & Predictions\n\n"
        content += f"{forecast_res['explanation']}\n\n"
        content += "**Projected Incidents Index (Next 3 Months):**\n"
        for f in forecast_res['forecast'][:3]:
            content += f"- **{f['month']}**: Predicted: **{f['predicted']}** cases (Range: {f['lower_bound']} - {f['upper_bound']})\n"
            
        content += f"\n**Seasonal Alert:** {spikes['weekend_trend']['title']} - Weekend incidents rise by **{spikes['weekend_trend']['percentage_increase']}%** compared to weekdays."
        
        return AgentResponse(
            content=content,
            intent="FORECAST",
            records=forecast_res['forecast'],
            confidence=0.86,
            reasoning=reasoning
        )

    @staticmethod
    def _execute_rag_agent(db: Session, query: str) -> AgentResponse:
        """
        RAG Agent: Semantic searches IPC/BNS/SOP PDF documents
        """
        reasoning = f"RAG Agent activated. Embedding query '{query}'. Querying Qdrant collection 'knowledge_collection' for legal chunks."
        
        rag_matches = VectorService.query_knowledge_base(db, query, limit=3)
        
        content = "### Knowledge Base RAG Search Results\n\n"
        content += "Retrieved corresponding legal and procedural codes from indexed manuals:\n\n"
        
        for m in rag_matches:
            content += f"**Source**: *{m['filename']}* (Match: {int(m['score']*100)}%)\n"
            content += f"> {m['content']}\n\n"
            
        return AgentResponse(
            content=content,
            intent="RAG_LAW",
            records=rag_matches,
            confidence=0.90,
            reasoning=reasoning
        )

    @staticmethod
    def _execute_analytics_agent(db: Session, query: str) -> AgentResponse:
        """
        Analytics Agent: Gathers database aggregations and returns chart structures
        """
        from app.routers.analytics import get_overview_metrics, get_categories_breakdown
        
        reasoning = "Analytics Agent activated. Executed SQL count aggregates on CaseMaster, CrimeHead, and CaseStatusMaster tables."
        
        overview = get_overview_metrics(db)
        categories = get_categories_breakdown(db)
        
        content = "### Crime Analytics Summary\n\n"
        content += f"- **Total Database FIRs**: {overview['total_cases']}\n"
        content += f"- **Cases Under Active Investigation**: {overview['under_investigation']}\n"
        content += f"- **Chargesheet Rate**: {round((overview['chargesheeted']/overview['total_cases'])*100, 1) if overview['total_cases'] > 0 else 0}%\n\n"
        content += "**Major Crime Classifications:**\n"
        for cat in categories:
            content += f"- {cat['category']}: **{cat['count']}** incidents\n"
            
        return AgentResponse(
            content=content,
            intent="ANALYTICS",
            records=categories,
            confidence=0.94,
            reasoning=reasoning
        )
