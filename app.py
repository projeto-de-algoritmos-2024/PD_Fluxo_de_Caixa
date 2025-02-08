from flask import Flask, render_template, jsonify, request
import networkx as nx
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

def bellman_ford(edges, source, V):
    try:
        dist = {i: float("inf") for i in range(V)}
        dist[source] = 0
        
        logging.debug(f"Initial edges: {edges}")
        logging.debug(f"Number of vertices: {V}")
        
        for i in range(V):
            for edge in edges:
                try:
                    u = int(edge['source']) if isinstance(edge['source'], (str, int)) else int(edge['source']['id'])
                    v = int(edge['target']) if isinstance(edge['target'], (str, int)) else int(edge['target']['id'])
                    w = float(edge['weight'])
                    logging.debug(f"Processing edge: {u} -> {v} with weight {w}")
                    
                    if dist[u] != float("inf") and dist[u] + w < dist[v]:
                        dist[v] = dist[v] + w
                except Exception as e:
                    logging.error(f"Error processing edge {edge}: {str(e)}")
                    raise
        
        for edge in edges:
            u = int(edge['source']) if isinstance(edge['source'], (str, int)) else int(edge['source']['id'])
            v = int(edge['target']) if isinstance(edge['target'], (str, int)) else int(edge['target']['id'])
            w = float(edge['weight'])
            if dist[u] != float("inf") and dist[u] + w < dist[v]:
                return None
        
        logging.debug(f"Final distances: {dist}")
        return dist
    except Exception as e:
        logging.error(f"Error in bellman_ford: {str(e)}")
        raise

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.json
        logging.debug(f"Received data: {data}")
        
        nodes = data['nodes']
        edges = data['edges']
        
        logging.debug(f"Processing {len(nodes)} nodes and {len(edges)} edges")
        
        distances = bellman_ford(edges, 0, len(nodes))
        
        if distances is None:
            G = nx.DiGraph()
            for edge in edges:
                G.add_edge(edge['source'], edge['target'], weight=edge['weight'])
            
            try:
                cycle = nx.find_negative_cycle(G, 0)
                cycle_names = [str(node) for node in cycle]
            except:
                cycle_names = []
            
            return jsonify({
                'has_negative_cycle': True,
                'negative_cycle': cycle_names
            })
        else:
            return jsonify({
                'has_negative_cycle': False,
                'source': 0,
                'distances': distances
            })
            
    except Exception as e:
        logging.error(f"Error in analyze endpoint: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

if __name__ == '__main__':
    app.run(debug=True)