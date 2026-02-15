#!/usr/bin/env python3
"""
Export Neo4j Family Data to JSON
Exports all persons and relationships to a JSON file for backup or transfer
"""

import json
from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'your_password_here')


def export_family_data():
    """Export all family data to JSON"""
    
    print("🔄 Connecting to Neo4j...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        with driver.session() as session:
            # Export persons
            print("📊 Exporting persons...")
            result = session.run("""
                MATCH (p:Person)
                RETURN ID(p) as id, p.name as name, p.nickName as nickName,
                       p.gender as gender, p.sex as sex, p.dateOfBirth as dateOfBirth
                ORDER BY p.name
            """)
            
            persons = []
            for record in result:
                persons.append({
                    'id': str(record['id']),
                    'name': record['name'],
                    'nickName': record['nickName'],
                    'gender': record['gender'],
                    'sex': record['sex'],
                    'dateOfBirth': record['dateOfBirth']
                })
            
            print(f"   ✅ Exported {len(persons)} persons")
            
            # Export relationships
            print("🔗 Exporting relationships...")
            result = session.run("""
                MATCH (p1:Person)-[r]->(p2:Person)
                RETURN ID(p1) as fromId, ID(p2) as toId, type(r) as type
            """)
            
            relationships = []
            for record in result:
                relationships.append({
                    'from': str(record['fromId']),
                    'to': str(record['toId']),
                    'type': record['type']
                })
            
            print(f"   ✅ Exported {len(relationships)} relationships")
            
            # Create export data structure
            export_data = {
                'metadata': {
                    'export_date': datetime.now().isoformat(),
                    'total_persons': len(persons),
                    'total_relationships': len(relationships),
                    'source': 'FamilyGraph Explorer'
                },
                'persons': persons,
                'relationships': relationships
            }
            
            # Save to JSON file
            filename = f"family_data_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            print(f"\n✅ Export complete!")
            print(f"📁 Saved to: {filename}")
            print(f"\n📊 Summary:")
            print(f"   Persons: {len(persons)}")
            print(f"   Relationships: {len(relationships)}")
            
            # Show statistics
            gender_count = {}
            for person in persons:
                gender = person.get('gender', 'unknown')
                gender_count[gender] = gender_count.get(gender, 0) + 1
            
            print(f"\n👥 Gender Distribution:")
            for gender, count in gender_count.items():
                print(f"   {gender.capitalize()}: {count}")
            
            # Relationship types
            rel_type_count = {}
            for rel in relationships:
                rel_type = rel['type']
                rel_type_count[rel_type] = rel_type_count.get(rel_type, 0) + 1
            
            print(f"\n🔗 Relationship Types:")
            for rel_type, count in rel_type_count.items():
                print(f"   {rel_type}: {count}")
            
    except Exception as e:
        print(f"❌ Error during export: {str(e)}")
    finally:
        driver.close()


def import_from_json(filename):
    """Import family data from JSON file"""
    
    print(f"📂 Loading data from {filename}...")
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        persons = data['persons']
        relationships = data['relationships']
        
        print(f"   Found {len(persons)} persons and {len(relationships)} relationships")
        
        # Connect to Neo4j
        print("\n🔄 Connecting to Neo4j...")
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            # Create persons
            print("👥 Creating persons...")
            for person in persons:
                session.run("""
                    CREATE (p:Person {
                        name: $name,
                        nickName: $nickName,
                        gender: $gender,
                        sex: $sex,
                        dateOfBirth: $dateOfBirth
                    })
                """, 
                    name=person['name'],
                    nickName=person.get('nickName', ''),
                    gender=person.get('gender', ''),
                    sex=person.get('sex', ''),
                    dateOfBirth=person.get('dateOfBirth', '')
                )
            
            print(f"   ✅ Created {len(persons)} persons")
            
            # Create relationships
            print("🔗 Creating relationships...")
            for rel in relationships:
                # Get person IDs by name (since internal IDs might be different)
                query = f"""
                    MATCH (p1:Person), (p2:Person)
                    WHERE ID(p1) = $fromId AND ID(p2) = $toId
                    CREATE (p1)-[r:{rel['type']}]->(p2)
                """
                
                try:
                    session.run(query, fromId=int(rel['from']), toId=int(rel['to']))
                except:
                    print(f"   ⚠️  Could not create relationship: {rel}")
            
            print(f"   ✅ Created relationships")
        
        driver.close()
        
        print("\n✅ Import complete!")
        
    except FileNotFoundError:
        print(f"❌ Error: File '{filename}' not found")
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in file '{filename}'")
    except Exception as e:
        print(f"❌ Error during import: {str(e)}")


if __name__ == '__main__':
    import sys
    
    print("\n" + "=" * 60)
    print("  FamilyGraph Explorer - Data Export/Import Tool")
    print("=" * 60)
    
    if len(sys.argv) > 1:
        if sys.argv[1] == 'import' and len(sys.argv) > 2:
            # Import mode
            import_from_json(sys.argv[2])
        else:
            print("\nUsage:")
            print("  Export: python export_data.py")
            print("  Import: python export_data.py import <filename.json>")
    else:
        # Export mode (default)
        export_family_data()
    
    print()
