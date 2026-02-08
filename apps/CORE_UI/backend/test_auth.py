#!/usr/bin/env python3
"""
Test script for authentication endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_auth_endpoints():
    print("=== Testing CORE-SE Authentication System ===\n")
    
    # Test 1: Login with admin user
    print("1. Testing login with admin user...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            print(f"✓ Admin login successful!")
            print(f"  User: {token_data['user']['full_name']} ({token_data['user']['role']})")
            print(f"  Token: {token_data['access_token'][:50]}...")
            admin_token = token_data['access_token']
        else:
            print(f"✗ Admin login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"✗ Error connecting to server: {e}")
        return
    
    # Test 2: Login with influencer user
    print("\n2. Testing login with influencer user...")
    login_data = {
        "username": "influencer", 
        "password": "influencer123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            print(f"✓ Influencer login successful!")
            print(f"  User: {token_data['user']['full_name']} ({token_data['user']['role']})")
            influencer_token = token_data['access_token']
        else:
            print(f"✗ Influencer login failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Login with consumer user
    print("\n3. Testing login with consumer user...")
    login_data = {
        "username": "consumer",
        "password": "consumer123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            print(f"✓ Consumer login successful!")
            print(f"  User: {token_data['user']['full_name']} ({token_data['user']['role']})")
            consumer_token = token_data['access_token']
        else:
            print(f"✗ Consumer login failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 4: Get current user profile (admin)
    print("\n4. Testing get current user profile (admin)...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            print(f"✓ Profile retrieved successfully!")
            print(f"  ID: {user_data['id']}")
            print(f"  Username: {user_data['username']}")
            print(f"  Email: {user_data['email']}")
            print(f"  Role: {user_data['role']}")
        else:
            print(f"✗ Profile retrieval failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 5: List all users (admin only)
    print("\n5. Testing list all users (admin only)...")
    try:
        response = requests.get(f"{BASE_URL}/auth/users", headers=headers)
        if response.status_code == 200:
            users = response.json()
            print(f"✓ User list retrieved successfully!")
            print(f"  Total users: {len(users)}")
            for user in users:
                print(f"  - {user['full_name']} ({user['role']}) - {user['email']}")
        else:
            print(f"✗ User list retrieval failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 6: Register new user
    print("\n6. Testing user registration...")
    register_data = {
        "username": "newuser",
        "email": "newuser@test.com", 
        "password": "password123",
        "full_name": "New Test User",
        "role": "consumer"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        if response.status_code == 201:
            token_data = response.json()
            print(f"✓ User registration successful!")
            print(f"  User: {token_data['user']['full_name']} ({token_data['user']['role']})")
        else:
            print(f"✗ User registration failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n=== Authentication System Test Complete ===")

if __name__ == "__main__":
    test_auth_endpoints()