"""
Test script for CORE-SE Demo APIs
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
FDS_URL = "http://localhost:8001"
AUTH_HEADER = {"Authorization": "Bearer demo-token-123"}

def test_endpoint(name, url, method="GET", data=None, headers=None):
    """Test an API endpoint"""
    print(f"\n🧪 Testing {name}...")
    print(f"   {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            print(f"   ✅ SUCCESS ({response.status_code})")
            if response.headers.get("content-type", "").startswith("application/json"):
                result = response.json()
                if isinstance(result, list):
                    print(f"   📊 Returned {len(result)} items")
                elif isinstance(result, dict):
                    print(f"   📋 Keys: {list(result.keys())}")
        else:
            print(f"   ❌ FAILED ({response.status_code}): {response.text}")
    
    except Exception as e:
        print(f"   💥 ERROR: {str(e)}")

def main():
    """Run all API tests"""
    print("🚀 CORE-SE Demo API Testing")
    print("=" * 50)
    
    # Health checks
    test_endpoint("FDS Health", f"{FDS_URL}/health")
    test_endpoint("Backend Health", f"{BASE_URL}/health")
    
    # Configuration
    test_endpoint("Config", f"{BASE_URL}/api/config")
    
    # Authenticated endpoints
    headers = AUTH_HEADER
    
    # Pulse feed
    test_endpoint("Pulse Feed", f"{BASE_URL}/api/pulse?limit=5", headers=headers)
    test_endpoint("Pulse Feed (Jama only)", f"{BASE_URL}/api/pulse?sources=jama&limit=3", headers=headers)
    
    # Impact analysis
    test_endpoint("Impact Analysis", f"{BASE_URL}/api/impact/JAMA-REQ-001", headers=headers)
    
    # Tasks
    test_endpoint("Get Tasks", f"{BASE_URL}/api/tasks", headers=headers)
    
    task_data = {
        "title": "API Test Task",
        "description": "Testing task creation via API",
        "priority": "medium"
    }
    test_endpoint("Create Task", f"{BASE_URL}/api/tasks", method="POST", data=task_data, headers=headers)
    
    # Knowledge
    test_endpoint("Knowledge Search", f"{BASE_URL}/api/knowledge?q=testing&limit=3", headers=headers)
    
    # Windows
    test_endpoint("Window Link", f"{BASE_URL}/api/windows/jama/JAMA-REQ-001", headers=headers)
    
    # Direct FDS tests
    print(f"\n🔧 Testing FDS Directly")
    print("-" * 30)
    test_endpoint("FDS Pulse", f"{FDS_URL}/mock/pulse?limit=3")
    test_endpoint("FDS Jama Items", f"{FDS_URL}/mock/jama/items?limit=3")
    test_endpoint("FDS Impact", f"{FDS_URL}/mock/impact/JAMA-REQ-001")
    
    print(f"\n🎉 API Testing Complete!")
    print("\n📝 To enable AI features:")
    print("   1. Add your OpenAI API key to backend/.env")
    print("   2. Set FEATURE_AI_MICROCALLS=true in backend/.env")
    print("   3. Restart the backend server")

if __name__ == "__main__":
    main()
