import os
import sys
import unittest
from datetime import datetime

# Setup paths to import from backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, check_db_health
from app.services.agents import AgentOrchestrator
from app.services.graph_service import GraphService
from app.services.vector_service import VectorService


class TestTrinetraAI(unittest.TestCase):
    def setUp(self):
        # Setup test markers
        pass

    def test_database_connections(self):
        """
        Verify that database connections and connection helpers execute
        """
        status = check_db_health()
        print(f"Connection status: {status}")
        self.assertIn("postgres", status)
        self.assertIn("neo4j", status)
        self.assertIn("qdrant", status)
        self.assertIn("redis", status)

    def test_agent_intent_classification(self):
        """
        Test that the multi-agent routing loop correctly maps queries to intents
        """
        memory = {"is_followup": False}
        
        # SQL cases
        intent1, _ = AgentOrchestrator._classify_intent("Show all burglary FIRs in Bangalore", memory)
        self.assertEqual(intent1, "SQL_QUERY")
        
        # Similarity cases
        intent2, _ = AgentOrchestrator._classify_intent("Find similar past cases", memory)
        self.assertEqual(intent2, "CASE_SIMILARITY")
        
        # Forecast cases
        intent3, _ = AgentOrchestrator._classify_intent("Forecast future hotspots next month", memory)
        self.assertEqual(intent3, "FORECAST")
        
        # Graph cases
        intent4, _ = AgentOrchestrator._classify_intent("Show criminal associations and shortest path from Sunil to Raju", memory)
        self.assertEqual(intent4, "GRAPH_RELATION")
        
        # RAG / SOP cases
        intent5, _ = AgentOrchestrator._classify_intent("What is the legal procedure for burglary scene forensic manuals?", memory)
        self.assertEqual(intent5, "RAG_LAW")

    def test_local_cosine_similarity(self):
        """
        Test that local cosine fallback matches properly
        """
        from app.services.vector_service import embedder
        v1 = embedder.encode("armed bank robbery dacoity")
        v2 = embedder.encode("bank heist and dacoity at knifepoint")
        v3 = embedder.encode("domestic dispute family fight")
        
        import numpy as np
        dot1 = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        dot2 = np.dot(v1, v3) / (np.linalg.norm(v1) * np.linalg.norm(v3))
        
        print(f"Sim 1-2: {dot1}, Sim 1-3: {dot2}")
        self.assertTrue(dot1 > dot2) # robbery should match bank heist much closer than family dispute!


if __name__ == "__main__":
    unittest.main()
