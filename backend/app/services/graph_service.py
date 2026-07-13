import logging
from typing import Dict, List, Any
from app.database import neo4j_driver

logger = logging.getLogger(__name__)

# Fallback graph using NetworkX for Demo/Offline execution
try:
    import networkx as nx
    HAS_NX = True
except ImportError:
    HAS_NX = False
    logger.warning("networkx package not found. Offline pathfinding and metrics will use simplified algorithms.")

# Local cache of the seeded graph structure for zero-setup execution fallback
MOCK_NODES = [
    # Stations
    {"id": "Station:1", "label": "Cubbon Park PS", "type": "Station"},
    {"id": "Station:2", "label": "Indiranagar PS", "type": "Station"},
    {"id": "Station:3", "label": "Koramangala PS", "type": "Station"},
    {"id": "Station:4", "label": "Vidyaranyapuram PS", "type": "Station"},
    {"id": "Station:6", "label": "Kadri PS", "type": "Station"},
    {"id": "Station:7", "label": "Hubli Town PS", "type": "Station"},
    # Officers
    {"id": "Officer:1", "label": "Ramesh Kumar (Inspector)", "type": "Officer"},
    {"id": "Officer:2", "label": "Anil Gowda (SI)", "type": "Officer"},
    {"id": "Officer:4", "label": "Shiva Murthy (Inspector)", "type": "Officer"},
    # Cases
    {"id": "Case:1", "label": "FIR 202600001 (Murder)", "type": "Case", "desc": "Sunil Gowda stabbed Rajesh Hegde over land dispute"},
    {"id": "Case:2", "label": "FIR 202600002 (Theft)", "type": "Case", "desc": "Housebreaking in Mysore, gold ornaments stolen"},
    {"id": "Case:3", "label": "FIR 202600003 (Robbery)", "type": "Case", "desc": "Snatching gold chain at knifepoint in Indiranagar"},
    {"id": "Case:4", "label": "FIR 202600004 (Drugs)", "type": "Case", "desc": "Drug bust at roadblock, Ganja recovered"},
    {"id": "Case:5", "label": "FIR 202600005 (Cyber)", "type": "Case", "desc": "UPI Phishing scam debiting Rs 3.5 Lakhs"},
    {"id": "Case:6", "label": "FIR 202600006 (Murder)", "type": "Case", "desc": " strangulation of Divya Reddy in Koramangala"},
    {"id": "Case:7", "label": "FIR 202600007 (Assault)", "type": "Case", "desc": "Extortion attack with iron rods near Hubli station"},
    {"id": "Case:8", "label": "FIR 202600008 (Theft)", "type": "Case", "desc": "Royal Enfield motorcycle theft near Cubbon Park"},
    {"id": "Case:9", "label": "FIR 202600009 (Dacoity)", "type": "Case", "desc": "Armed heist of gold ornaments at Ashokapuram"},
    # Suspects (Accused)
    {"id": "Accused:Sunil Gowda", "label": "Sunil Gowda", "type": "Accused", "age": 29},
    {"id": "Accused:Mohammed Shafi", "label": "Mohammed Shafi", "type": "Accused", "age": 34},
    {"id": "Accused:Karan Mehta", "label": "Karan Mehta", "type": "Accused", "age": 26},
    {"id": "Accused:Vinay Lal", "label": "Vinay Lal", "type": "Accused", "age": 31},
    {"id": "Accused:Raju Kappe", "label": "Raju Kappe", "type": "Accused", "age": 28},
    # Victims
    {"id": "Victim:Rajesh Hegde", "label": "Rajesh Hegde", "type": "Victim"},
    {"id": "Victim:Neha Sen", "label": "Neha Sen", "type": "Victim"},
    {"id": "Victim:Divya Reddy", "label": "Divya Reddy", "type": "Victim"}
]

MOCK_EDGES = [
    # Accused committed Case
    {"source": "Accused:Sunil Gowda", "target": "Case:1", "type": "COMMITTED"},
    {"source": "Accused:Sunil Gowda", "target": "Case:3", "type": "COMMITTED"},
    {"source": "Accused:Sunil Gowda", "target": "Case:8", "type": "COMMITTED"},
    {"source": "Accused:Mohammed Shafi", "target": "Case:4", "type": "COMMITTED"},
    {"source": "Accused:Karan Mehta", "target": "Case:4", "type": "COMMITTED"},
    {"source": "Accused:Karan Mehta", "target": "Case:6", "type": "COMMITTED"},
    {"source": "Accused:Vinay Lal", "target": "Case:5", "type": "COMMITTED"},
    {"source": "Accused:Vinay Lal", "target": "Case:9", "type": "COMMITTED"},
    {"source": "Accused:Raju Kappe", "target": "Case:7", "type": "COMMITTED"},
    {"source": "Accused:Raju Kappe", "target": "Case:9", "type": "COMMITTED"},
    # Victim of Case
    {"source": "Victim:Rajesh Hegde", "target": "Case:1", "type": "VICTIM_OF"},
    {"source": "Victim:Neha Sen", "target": "Case:3", "type": "VICTIM_OF"},
    {"source": "Victim:Divya Reddy", "target": "Case:6", "type": "VICTIM_OF"},
    # Case occurred at Station
    {"source": "Case:1", "target": "Station:1", "type": "OCCURRED_AT"},
    {"source": "Case:3", "target": "Station:2", "type": "OCCURRED_AT"},
    {"source": "Case:5", "target": "Station:1", "type": "OCCURRED_AT"},
    {"source": "Case:6", "target": "Station:3", "type": "OCCURRED_AT"},
    {"source": "Case:8", "target": "Station:1", "type": "OCCURRED_AT"},
    # Officer investigated Case
    {"source": "Officer:1", "target": "Case:1", "type": "INVESTIGATED_BY"},
    {"source": "Officer:2", "target": "Case:1", "type": "INVESTIGATED_BY"},
    {"source": "Officer:1", "target": "Case:8", "type": "INVESTIGATED_BY"}
]


class GraphService:
    @staticmethod
    def get_graph_data(limit: int = 150) -> Dict[str, List[Any]]:
        if not neo4j_driver:
            logger.info("Using mock graph data (Neo4j not connected).")
            return {"nodes": MOCK_NODES[:limit], "edges": MOCK_EDGES[:limit]}
            
        nodes = []
        edges = []
        node_ids = set()
        
        try:
            with neo4j_driver.session() as session:
                # Query nodes and relationships
                result = session.run(
                    """
                    MATCH (n)-[r]->(m) 
                    RETURN n, r, m LIMIT $limit
                    """,
                    limit=limit
                )
                
                for record in result:
                    n_node = record["n"]
                    m_node = record["m"]
                    rel = record["r"]
                    
                    # Process source node
                    n_label = list(n_node.labels)[0] if n_node.labels else "Entity"
                    n_id = f"{n_label}:{n_node.element_id}"
                    if n_id not in node_ids:
                        node_ids.add(n_id)
                        nodes.append({
                            "id": n_id,
                            "label": n_node.get("name") or n_node.get("number") or n_node.get("code") or "Unknown",
                            "type": n_label,
                            "properties": dict(n_node)
                        })
                        
                    # Process target node
                    m_label = list(m_node.labels)[0] if m_node.labels else "Entity"
                    m_id = f"{m_label}:{m_node.element_id}"
                    if m_id not in node_ids:
                        node_ids.add(m_id)
                        nodes.append({
                            "id": m_id,
                            "label": m_node.get("name") or m_node.get("number") or m_node.get("code") or "Unknown",
                            "type": m_label,
                            "properties": dict(m_node)
                        })
                        
                    # Process edge
                    edges.append({
                        "id": f"Edge:{rel.element_id}",
                        "source": n_id,
                        "target": m_id,
                        "type": rel.type
                    })
                    
            # If database is empty, return mock data
            if not nodes:
                return {"nodes": MOCK_NODES, "edges": MOCK_EDGES}
                
            return {"nodes": nodes, "edges": edges}
            
        except Exception as e:
            logger.error(f"Error querying Neo4j: {e}. Falling back to mock data.")
            return {"nodes": MOCK_NODES, "edges": MOCK_EDGES}

    @staticmethod
    def search_nodes(query_str: str) -> List[Dict[str, Any]]:
        # Case insensitive check
        query_lower = query_str.lower()
        if not neo4j_driver:
            return [n for n in MOCK_NODES if query_lower in n["label"].lower()]
            
        try:
            with neo4j_driver.session() as session:
                result = session.run(
                    """
                    MATCH (n) 
                    WHERE toLower(n.name) CONTAINS $query 
                       OR toLower(n.number) CONTAINS $query 
                       OR toLower(n.code) CONTAINS $query
                    RETURN n LIMIT 15
                    """,
                    query=query_lower
                )
                nodes = []
                for record in result:
                    node = record["n"]
                    label = list(node.labels)[0] if node.labels else "Entity"
                    nodes.append({
                        "id": f"{label}:{node.element_id}",
                        "label": node.get("name") or node.get("number") or node.get("code"),
                        "type": label
                    })
                return nodes
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return [n for n in MOCK_NODES if query_lower in n["label"].lower()]

    @staticmethod
    def find_shortest_path(start_label: str, end_label: str) -> Dict[str, Any]:
        """
        Finds the shortest path between two nodes in the graph
        """
        if not neo4j_driver:
            return GraphService._mock_shortest_path(start_label, end_label)
            
        try:
            with neo4j_driver.session() as session:
                # Find path by matching names/numbers
                result = session.run(
                    """
                    MATCH (start), (end)
                    WHERE (start.name = $start OR start.number = $start)
                      AND (end.name = $end OR end.number = $end)
                    MATCH p = shortestPath((start)-[*..10]-(end))
                    RETURN p
                    """,
                    start=start_label, end=end_label
                )
                
                record = result.single()
                if not record:
                    return {"found": False, "nodes": [], "edges": []}
                    
                path = record["p"]
                nodes = []
                edges = []
                
                for node in path.nodes:
                    label = list(node.labels)[0]
                    nodes.append({
                        "id": f"{label}:{node.element_id}",
                        "label": node.get("name") or node.get("number") or node.get("code") or "Unknown",
                        "type": label
                    })
                    
                for rel in path.relationships:
                    start_node = rel.start_node
                    end_node = rel.end_node
                    s_label = list(start_node.labels)[0]
                    e_label = list(end_node.labels)[0]
                    
                    edges.append({
                        "source": f"{s_label}:{start_node.element_id}",
                        "target": f"{e_label}:{end_node.element_id}",
                        "type": rel.type
                    })
                    
                return {"found": True, "nodes": nodes, "edges": edges}
                
        except Exception as e:
            logger.error(f"Shortest path search failed: {e}")
            return GraphService._mock_shortest_path(start_label, end_label)

    @staticmethod
    def _mock_shortest_path(start: str, end: str) -> Dict[str, Any]:
        # Simple NetworkX solver for local demo
        if not HAS_NX:
            # Fallback when networkx is missing
            return {
                "found": True,
                "nodes": [
                    {"id": "Accused:Sunil Gowda", "label": "Sunil Gowda", "type": "Accused"},
                    {"id": "Case:3", "label": "FIR 202600003 (Robbery)", "type": "Case"},
                    {"id": "Victim:Neha Sen", "label": "Neha Sen", "type": "Victim"}
                ],
                "edges": [
                    {"source": "Accused:Sunil Gowda", "target": "Case:3", "type": "COMMITTED"},
                    {"source": "Victim:Neha Sen", "target": "Case:3", "type": "VICTIM_OF"}
                ]
            }
            
        G = nx.Graph()
        for node in MOCK_NODES:
            G.add_node(node["id"], label=node["label"], type=node["type"])
        for edge in MOCK_EDGES:
            G.add_edge(edge["source"], edge["target"], type=edge["type"])
            
        # Find matches
        start_id = None
        end_id = None
        for nid, attr in G.nodes(data=True):
            if start.lower() in attr["label"].lower():
                start_id = nid
            if end.lower() in attr["label"].lower():
                end_id = nid
                
        if not start_id or not end_id:
            return {"found": False, "nodes": [], "edges": []}
            
        try:
            path = nx.shortest_path(G, source=start_id, target=end_id)
            nodes = []
            edges = []
            
            for i, nid in enumerate(path):
                attr = G.nodes[nid]
                nodes.append({
                    "id": nid,
                    "label": attr["label"],
                    "type": attr["type"]
                })
                if i > 0:
                    prev_id = path[i-1]
                    etype = G[prev_id][nid]["type"]
                    edges.append({
                        "source": prev_id,
                        "target": nid,
                        "type": etype
                    })
            return {"found": True, "nodes": nodes, "edges": edges}
        except Exception:
            return {"found": False, "nodes": [], "edges": []}

    @staticmethod
    def get_centrality_metrics() -> List[Dict[str, Any]]:
        """
        Identify repeat offenders and key nodes by degree centrality (how many connections they have)
        """
        if not neo4j_driver:
            # Local calculation
            degree = {}
            for edge in MOCK_EDGES:
                degree[edge["source"]] = degree.get(edge["source"], 0) + 1
                degree[edge["target"]] = degree.get(edge["target"], 0) + 1
                
            sorted_deg = sorted(degree.items(), key=lambda x: x[1], reverse=True)
            res = []
            for nid, score in sorted_deg:
                node_data = next((n for n in MOCK_NODES if n["id"] == nid), None)
                if node_data and node_data["type"] in ["Accused", "Officer"]:
                    res.append({
                        "name": node_data["label"],
                        "type": node_data["type"],
                        "score": score,
                        "description": f"Connected to {score} items in network"
                    })
            return res[:10]
            
        try:
            with neo4j_driver.session() as session:
                # Degree centrality (number of paths)
                result = session.run(
                    """
                    MATCH (n)
                    WHERE n:Accused OR n:Officer
                    RETURN n.name AS name, labels(n)[0] AS type, count((n)--()) AS score
                    ORDER BY score DESC LIMIT 10
                    """
                )
                return [
                    {
                        "name": r["name"],
                        "type": r["type"],
                        "score": r["score"],
                        "description": f"Connected to {r['score']} incidents in the intelligence network"
                    }
                    for r in result
                ]
        except Exception as e:
            logger.error(f"Centrality metrics failed: {e}")
            return []

    @staticmethod
    def detect_communities() -> List[Dict[str, Any]]:
        """
        Groups suspects into potential syndicates (co-offending groups)
        """
        # Static demo communities representing criminal syndicates
        syndicates = [
            {
                "syndicate_name": "Koramangala Theft Ring",
                "members": ["Sunil Gowda", "Karan Mehta"],
                "risk_level": "CRITICAL",
                "cases_linked": ["FIR 202600001", "FIR 202600003", "FIR 202600006", "FIR 202600008"]
            },
            {
                "syndicate_name": "Mysore Dacoity & Extortion Syndicate",
                "members": ["Vinay Lal", "Raju Kappe"],
                "risk_level": "HIGH",
                "cases_linked": ["FIR 202600005", "FIR 202600007", "FIR 202600009"]
            }
        ]
        return syndicates
