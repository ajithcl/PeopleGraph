#!/usr/bin/env python3
"""
Test Neo4j Connection and View Data
This script helps you verify your Neo4j connection and view existing data
"""

from neo4j import GraphDatabase
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'your_password_here')


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)


def test_connection():
    """Test Neo4j database connection"""
    print_header("Testing Neo4j Connection")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            result = session.run("RETURN 1 as test")
            result.single()
        
        print("✅ Successfully connected to Neo4j!")
        print(f"   URI: {NEO4J_URI}")
        print(f"   User: {NEO4J_USER}")
        
        driver.close()
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j")
        print(f"   Error: {str(e)}")
        print("\nTroubleshooting:")
        print("   1. Is Neo4j running? (neo4j status)")
        print("   2. Is the URI correct in .env?")
        print("   3. Is the password correct?")
        return False


def count_nodes_and_relationships():
    """Count total persons and relationships"""
    print_header("Database Statistics")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            # Count persons
            result = session.run("MATCH (p:Person) RETURN count(p) as total")
            total_persons = result.single()['total']
            
            # Count by gender
            result = session.run("""
                MATCH (p:Person)
                RETURN p.gender as gender, count(p) as count
            """)
            gender_counts = {record['gender']: record['count'] for record in result}
            
            # Count relationships
            result = session.run("MATCH ()-[r]->() RETURN count(r) as total")
            total_relationships = result.single()['total']
            
            # Count by relationship type
            result = session.run("""
                MATCH ()-[r]->()
                RETURN type(r) as relType, count(r) as count
            """)
            rel_type_counts = {record['relType']: record['count'] for record in result}
        
        print(f"📊 Total Persons: {total_persons}")
        print(f"   👨 Male: {gender_counts.get('male', 0)}")
        print(f"   👩 Female: {gender_counts.get('female', 0)}")
        print(f"\n🔗 Total Relationships: {total_relationships}")
        
        if rel_type_counts:
            print("   Relationship Types:")
            for rel_type, count in rel_type_counts.items():
                print(f"     - {rel_type}: {count}")
        
        driver.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def list_all_persons():
    """List all persons in the database"""
    print_header("All Persons in Database")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                RETURN ID(p) as id, p.name as name, p.nickName as nickName, 
                       p.gender as gender, p.dateOfBirth as dob
                ORDER BY p.name
            """)
            
            persons = list(result)
            
            if not persons:
                print("⚠️  No persons found in database")
                return
            
            print(f"\nFound {len(persons)} person(s):\n")
            
            for i, record in enumerate(persons, 1):
                person_id = record['id']
                name = record['name']
                nick = record['nickName']
                gender = record['gender']
                dob = record['dob']
                
                # Calculate age if DOB exists
                age_str = ""
                if dob:
                    try:
                        birth_year = int(dob.split('-')[0])
                        current_year = datetime.now().year
                        age = current_year - birth_year
                        age_str = f" (Age: {age})"
                    except:
                        pass
                
                nick_str = f' "{nick}"' if nick else ''
                gender_icon = "👨" if gender == 'male' else "👩"
                
                print(f"{i:3d}. {gender_icon} [{person_id}] {name}{nick_str}{age_str}")
                if dob:
                    print(f"       Born: {dob}")
        
        driver.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def show_sample_relationships():
    """Show sample relationships"""
    print_header("Sample Relationships")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            result = session.run("""
                MATCH (p1:Person)-[r]->(p2:Person)
                RETURN p1.name as from, type(r) as relationship, p2.name as to
                LIMIT 20
            """)
            
            relationships = list(result)
            
            if not relationships:
                print("⚠️  No relationships found")
                return
            
            print(f"\nShowing up to 20 relationships:\n")
            
            for i, record in enumerate(relationships, 1):
                from_name = record['from']
                rel_type = record['relationship']
                to_name = record['to']
                
                # Format relationship type nicely
                rel_display = rel_type.replace('_', ' ').title()
                
                print(f"{i:3d}. {from_name} --[{rel_display}]--> {to_name}")
        
        driver.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def find_root_persons():
    """Find persons without parents (roots of family tree)"""
    print_header("Root Persons (No Parents)")
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        
        with driver.session() as session:
            result = session.run("""
                MATCH (p:Person)
                WHERE NOT (p)<-[:has_child]-()
                RETURN ID(p) as id, p.name as name, p.dateOfBirth as dob
                ORDER BY p.dateOfBirth
            """)
            
            roots = list(result)
            
            if not roots:
                print("⚠️  No root persons found")
                return
            
            print(f"\nFound {len(roots)} root person(s) (oldest generation):\n")
            
            for i, record in enumerate(roots, 1):
                person_id = record['id']
                name = record['name']
                dob = record['dob'] or 'Unknown'
                print(f"{i}. [{person_id}] {name} (Born: {dob})")
        
        driver.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def main():
    """Main function"""
    print("\n" + "🌳" * 30)
    print("   FamilyGraph Explorer - Database Inspector")
    print("🌳" * 30)
    
    # Test connection first
    if not test_connection():
        return
    
    # Show statistics
    count_nodes_and_relationships()
    
    # List all persons
    list_all_persons()
    
    # Show relationships
    show_sample_relationships()
    
    # Find roots
    find_root_persons()
    
    print("\n" + "=" * 60)
    print("✅ Inspection Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Start the Flask server: python app.py")
    print("  2. Open family-tree-production.html in your browser")
    print("  3. Start exploring your family tree!")
    print()


if __name__ == '__main__':
    main()
