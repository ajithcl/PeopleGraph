"""
FamilyGraph Explorer - Flask Backend
Python server for Neo4j family tree application
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
import logging
import neo4j
from werkzeug.utils import secure_filename
import uuid
from pathlib import Path


# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# File upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads', 'photos')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Create upload directory if it doesn't exist
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

logger.info(f"📁 Upload folder: {UPLOAD_FOLDER}")


# Neo4j Configuration
NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'Success@123')

# Initialize Neo4j driver
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def verify_connection():
    """Test Neo4j connection"""
    try:
        with driver.session() as session:
            result = session.run("RETURN 1")
            result.single()
        logger.info("✅ Successfully connected to Neo4j")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to connect to Neo4j: {str(e)}")
        return False

# Test connection on startup
verify_connection()


# ========== HELPER FUNCTIONS ==========
def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
def generate_unique_filename(person_id, original_filename):
    """Generate unique filename for uploaded photo"""
    ext = original_filename.rsplit('.', 1)[1].lower()
    unique_id = str(uuid.uuid4())[:8]
    return f"person_{person_id}_{unique_id}.{ext}"


def delete_old_photo(person_id):
    """Delete old photo file for a person if it exists"""
    try:
        # Find and delete files matching pattern person_{id}_*
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            if filename.startswith(f"person_{person_id}_"):
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                os.remove(file_path)
                logger.info(f"Deleted old photo: {filename}")
    except Exception as e:
        logger.error(f"Error deleting old photo: {str(e)}")



def serialize_date(value):
    if value is None:
        return None

    # Case 1: Neo4j Date
    if isinstance(value, neo4j.time.Date):
        return value.to_native().isoformat()

    # Case 2: Already a string
    if isinstance(value, str):
        return value

    # Fallback (optional)
    return str(value)

def format_person(node):
    """Format a Neo4j person node to dictionary"""
    return {
        'id': str(node.id),
        'name': node.get('name', ''),
        'nickName': node.get('nickName', ''),
        'gender': node.get('gender', ''),
        'sex': node.get('sex', ''),
        'dateOfBirth': serialize_date(node.get('dateOfBirth', '')),
        'photoUrl': node.get('photoUrl', '')
    }


# ========== API ENDPOINTS ==========

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'neo4j_connected': verify_connection()
    })


@app.route('/uploads/photos/<filename>', methods=['GET'])
def serve_photo(filename):
    """Serve uploaded photos"""
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        logger.error(f"Error serving photo: {str(e)}")
        return jsonify({'success': False, 'error': 'Photo not found'}), 404


@app.route('/api/persons/<person_id>/upload-photo', methods=['POST'])
def upload_photo(person_id):
    logger.info('upload_photo called')
    try:
        if 'photo' not in request.files:
            return jsonify({'success': False, 'error': 'No photo file provided'}), 400

        file = request.files['photo']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': f'Invalid file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

        # ✅ Step 1: Verify person exists first
        def check_person(tx, pid):
            result = tx.run("MATCH (p:Person) WHERE ID(p) = $id RETURN p", id=pid)
            return result.single()

        with driver.session() as session:
            record = session.execute_read(check_person, int(person_id))
            if not record:
                return jsonify({'success': False, 'error': 'Person not found'}), 404

        # ✅ Step 2: Delete old photo
        delete_old_photo(person_id)

        # ✅ Step 3: Save new file to disk
        filename = generate_unique_filename(person_id, file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        logger.info(f"Photo saved: {filename}")

        photo_url = f"/uploads/photos/{filename}"
        logger.info(f"photo_url: {photo_url}")

        # ✅ Step 4: Update DB with explicit write transaction — guaranteed commit or rollback
        def update_photo_url(tx, pid, url):
            result = tx.run("""
                MATCH (p:Person)
                WHERE ID(p) = $id
                SET p.photoUrl = $photoUrl
                RETURN p
            """, id=pid, photoUrl=url)
            record = result.single()
            if not record:
                raise ValueError("Person not found during update")
            return record['p']

        with driver.session() as session:
            try:
                node = session.execute_write(update_photo_url, int(person_id), photo_url)
                person = format_person(node)
                logger.info(f"Person saved: {person}")
            except Exception as db_err:
                # ✅ DB failed — clean up the file we just saved to avoid orphan
                if os.path.exists(filepath):
                    os.remove(filepath)
                    logger.warning(f"Rolled back file save due to DB error: {filename}")
                raise db_err

        return jsonify({
            'success': True,
            'data': person,
            'photoUrl': photo_url,
            'message': 'Photo uploaded successfully'
        })

    except Exception as e:
        logger.error(f"Error uploading photo: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/persons/<person_id>/delete-photo', methods=['DELETE'])
def delete_photo(person_id):
    """Delete photo for a person"""
    try:
        # Delete file from disk
        delete_old_photo(person_id)

        # Remove photoUrl from database
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                WHERE ID(p) = $id
                SET p.photoUrl = ''
                RETURN p
            """, id=int(person_id))

            record = result.single()

            if not record:
                return jsonify({
                    'success': False,
                    'error': 'Person not found'
                }), 404

            person = format_person(record['p'])

        return jsonify({
            'success': True,
            'data': person,
            'message': 'Photo deleted successfully'
        })

    except Exception as e:
        logger.error(f"Error deleting photo: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/persons', methods=['GET'])
def get_all_persons():
    """Get all persons from the database"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                RETURN p
                ORDER BY p.name
            """)
            
            persons = [format_person(record['p']) for record in result]
            
            return jsonify({
                'success': True,
                'data': persons
            })
    except Exception as e:
        logger.error(f"Error fetching persons: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/persons/<person_id>', methods=['GET'])
def get_person(person_id):
    """Get a specific person by ID"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                WHERE ID(p) = $id
                RETURN p
            """, id=int(person_id))
            
            record = result.single()
            if not record:
                return jsonify({
                    'success': False,
                    'error': 'Person not found'
                }), 404
            
            person = format_person(record['p'])
            
            return jsonify({
                'success': True,
                'data': person
            })
    except Exception as e:
        logger.error(f"Error fetching person: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/persons', methods=['POST'])
def create_person():
    """Create a new person"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name') or not data.get('gender'):
            return jsonify({
                'success': False,
                'error': 'Name and gender are required'
            }), 400
        
        with driver.session() as session:
            result = session.run("""
                CREATE (p:Person {
                    name: $name,
                    nickName: $nickName,
                    gender: $gender,
                    sex: $sex,
                    dateOfBirth: $dateOfBirth,
                    photoUrl: $photoUrl
                })
                RETURN p
            """, 
                name=data.get('name'),
                nickName=data.get('nickName', ''),
                gender=data.get('gender'),
                sex=data.get('sex', ''),
                dateOfBirth=data.get('dateOfBirth', ''),
                photoUrl=data.get('photoUrl', '')
            )
            
            record = result.single()
            person = format_person(record['p'])
            
            return jsonify({
                'success': True,
                'data': person
            }), 201
    except Exception as e:
        logger.error(f"Error creating person: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/persons/<person_id>', methods=['PUT'])
def update_person(person_id):
    """Update an existing person"""
    logger.info('update_person called')
    try:
        data = request.get_json()
        
        with driver.session() as session:
            logger.info(f'Running update query for person_id: {person_id} with data: {data}', )
            result = session.run("""
                MATCH (p:Person)
                WHERE ID(p) = $id
                SET p.name = $name,
                    p.nickName = $nickName,
                    p.gender = $gender,
                    p.sex = $sex,
                    p.dateOfBirth = $dateOfBirth,
                    p.photoUrl = $photoUrl
                RETURN p
            """,
                id=int(person_id),
                name=data.get('name'),
                nickName=data.get('nickName', ''),
                gender=data.get('gender'),
                sex=data.get('sex', ''),
                dateOfBirth=data.get('dateOfBirth', ''),
                photoUrl=data.get('photoUrl', '')
            )
            
            record = result.single()
            if not record:
                return jsonify({
                    'success': False,
                    'error': 'Person not found'
                }), 404
            
            person = format_person(record['p'])
            
            return jsonify({
                'success': True,
                'data': person
            })
    except Exception as e:
        logger.error(f"Error updating person: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/persons/<person_id>', methods=['DELETE'])
def delete_person(person_id):
    """Delete a person and all their relationships"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                WHERE ID(p) = $id
                DETACH DELETE p
                RETURN count(p) as deleted
            """, id=int(person_id))
            
            record = result.single()
            deleted = record['deleted']
            
            if deleted == 0:
                return jsonify({
                    'success': False,
                    'error': 'Person not found'
                }), 404
            
            return jsonify({
                'success': True,
                'message': 'Person deleted successfully'
            })
    except Exception as e:
        logger.error(f"Error deleting person: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/relationships', methods=['GET'])
def get_all_relationships():
    """Get all relationships in the database"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (p1:Person)-[r]->(p2:Person)
                RETURN ID(p1) as fromId, ID(p2) as toId, type(r) as type
            """)
            
            relationships = [
                {
                    'from': str(record['fromId']),
                    'to': str(record['toId']),
                    'type': record['type']
                }
                for record in result
            ]
            
            return jsonify({
                'success': True,
                'data': relationships
            })
    except Exception as e:
        logger.error(f"Error fetching relationships: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/persons/<person_id>/relationships', methods=['GET'])
def get_person_relationships(person_id):
    """Get all relationships for a specific person"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (p1:Person)-[r]-(p2:Person)
                WHERE ID(p1) = $id
                RETURN ID(p1) as person1Id, 
                       ID(p2) as person2Id,
                       type(r) as type,
                       p2 as relatedPerson,
                       CASE 
                           WHEN startNode(r) = p1 THEN 'outgoing'
                           ELSE 'incoming'
                       END as direction
            """, id=int(person_id))
            
            relationships = [
                {
                    'personId': str(record['person1Id']),
                    'relatedPersonId': str(record['person2Id']),
                    'relatedPerson': format_person(record['relatedPerson']),
                    'type': record['type'],
                    'direction': record['direction']
                }
                for record in result
            ]
            
            return jsonify({
                'success': True,
                'data': relationships
            })
    except Exception as e:
        logger.error(f"Error fetching person relationships: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/relationships', methods=['POST'])
def create_relationship():
    """Create a new relationship between two persons"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all(key in data for key in ['fromId', 'toId', 'type']):
            return jsonify({
                'success': False,
                'error': 'fromId, toId, and type are required'
            }), 400
        
        # Validate relationship type
        valid_types = ['SPOUSE_OF', 'HAS_CHILD', 'CHILD_OF', 'SIBLING_OF', 'PARENT_OF']
        rel_type = data['type']
        logger.info(f"Attempting to create relationship of type: {rel_type}")
        if rel_type not in valid_types:
            return jsonify({
                'success': False,
                'error': f'Invalid relationship type. Must be one of: {", ".join(valid_types)}'
            }), 400
        
        with driver.session() as session:
            # Use parameterized query with dynamic relationship type
            query = f"""
                MATCH (p1:Person), (p2:Person)
                WHERE ID(p1) = $fromId AND ID(p2) = $toId
                CREATE (p1)-[r:{rel_type}]->(p2)
                RETURN ID(p1) as fromId, ID(p2) as toId, type(r) as type
            """
            
            result = session.run(query,
                fromId=int(data['fromId']),
                toId=int(data['toId'])
            )
            
            record = result.single()

            logger.info(f"create_relationship result: {record}")
            
            if not record:
                return jsonify({
                    'success': False,
                    'error': 'One or both persons not found'
                }), 404
            
            relationship = {
                'from': str(record['fromId']),
                'to': str(record['toId']),
                'type': record['type']
            }
            
            return jsonify({
                'success': True,
                'data': relationship
            }), 201
    except Exception as e:
        logger.error(f"Error creating relationship: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/path/<id1>/<id2>', methods=['GET'])
def find_shortest_path(id1, id2):
    """Find the shortest path between two persons"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH path = shortestPath(
                    (p1:Person)-[*]-(p2:Person)
                )
                WHERE ID(p1) = $id1 AND ID(p2) = $id2
                RETURN [node in nodes(path) | ID(node)] as nodeIds,
                       [rel in relationships(path) | type(rel)] as relationshipTypes,
                       length(path) as pathLength
            """, id1=int(id1), id2=int(id2))
            
            record = result.single()
            
            if not record:
                return jsonify({
                    'success': True,
                    'data': None,
                    'message': 'No path found'
                })
            
            path = {
                'nodeIds': [str(node_id) for node_id in record['nodeIds']],
                'relationshipTypes': record['relationshipTypes'],
                'length': record['pathLength']
            }
            
            return jsonify({
                'success': True,
                'data': path
            })
    except Exception as e:
        logger.error(f"Error finding path: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/stats', methods=['GET'])
def get_statistics():
    """Get database statistics"""
    try:
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                OPTIONAL MATCH (p)-[r]-()
                RETURN 
                    count(DISTINCT p) as totalPersons,
                    count(DISTINCT CASE WHEN p.gender = 'male' THEN p END) as maleCount,
                    count(DISTINCT CASE WHEN p.gender = 'female' THEN p END) as femaleCount,
                    count(DISTINCT r) as totalRelationships
            """)
            
            record = result.single()
            
            stats = {
                'totalPersons': record['totalPersons'],
                'maleCount': record['maleCount'],
                'femaleCount': record['femaleCount'],
                'totalRelationships': record['totalRelationships']
            }
            
            return jsonify({
                'success': True,
                'data': stats
            })
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/search', methods=['GET'])
def search_persons():
    """Search persons by name or nickname"""
    try:
        query = request.args.get('query', '')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query parameter is required'
            }), 400
        
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                WHERE toLower(p.name) CONTAINS toLower($query)
                   OR toLower(p.nickName) CONTAINS toLower($query)
                RETURN p
                ORDER BY p.name
                LIMIT 20
            """, query=query)
            
            persons = [format_person(record['p']) for record in result]
            
            return jsonify({
                'success': True,
                'data': persons
            })
    except Exception as e:
        logger.error(f"Error searching persons: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/generations', methods=['GET'])
def get_generations():
    """Get family tree organized by generations"""
    try:
        with driver.session() as session:
            # Find root persons (those without parents)
            result = session.run("""
                MATCH (p:Person)
                WHERE NOT (p)<-[:has_child]-()
                RETURN p
                ORDER BY p.dateOfBirth
            """)
            
            roots = [format_person(record['p']) for record in result]
            
            return jsonify({
                'success': True,
                'data': {
                    'roots': roots,
                    'message': 'Root generation members'
                }
            })
    except Exception as e:
        logger.error(f"Error fetching generations: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ========== MAIN ==========

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    
    print("\n" + "="*60)
    print("🚀 FamilyGraph Explorer - Python Backend")
    print("="*60)
    print(f"📊 Server running on: http://localhost:{port}")
    print(f"🔗 Neo4j URI: {NEO4J_URI}")
    print("\nAvailable endpoints:")
    print("  GET    /api/persons              - Get all persons")
    print("  GET    /api/persons/<id>         - Get person by ID")
    print("  POST   /api/persons              - Create new person")
    print("  PUT    /api/persons/<id>         - Update person")
    print("  DELETE /api/persons/<id>         - Delete person")
    print("  GET    /api/relationships        - Get all relationships")
    print("  POST   /api/relationships        - Create relationship")
    print("  GET    /api/path/<id1>/<id2>     - Find shortest path")
    print("  GET    /api/stats                - Get statistics")
    print("  GET    /api/search?query=name    - Search persons")
    print("  GET    /api/generations          - Get root generation")
    print("  GET    /health                   - Health check")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=True)
