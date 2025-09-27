#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import time

class LocalHealthAPITester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test user
        self.test_user = {
            "email": f"local_test_user_{int(time.time())}@test.com",
            "password": "TestPass123!",
            "name": "Local Test User",
            "phone": "+1234567890",
            "user_type": "patient"
        }

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    details += f", Response: {response.json()}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return {"status": "success"}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    # --- TEST CASES ---
    def test_root_endpoint(self):
        return self.run_test("Root Endpoint", "GET", "/", 200)

    def test_user_registration(self):
        return self.run_test("User Registration", "POST", "/auth/register", 200, data=self.test_user) is not None

    def test_user_login(self):
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        result = self.run_test("User Login", "POST", "/auth/login", 200, data=login_data)
        if result and 'access_token' in result:
            self.token = result['access_token']
            self.user_data = result.get('user')
            return True
        return False

    def test_get_diseases(self):
        result = self.run_test("Get All Diseases", "GET", "/diseases", 200)
        if result and isinstance(result, list) and len(result) > 0:
            self.diseases = result
            return True
        return False

    def test_get_single_disease(self):
        if not hasattr(self, 'diseases') or not self.diseases:
            return False
        disease_id = self.diseases[0]['id']
        return self.run_test("Get Single Disease", "GET", f"/diseases/{disease_id}", 200) is not None

    def test_get_professionals_for_disease(self):
        if not hasattr(self, 'diseases') or not self.diseases:
            return False
        disease_id = self.diseases[0]['id']
        result = self.run_test("Get Professionals for Disease", "GET", f"/diseases/{disease_id}/professionals", 200)
        if result and isinstance(result, list) and len(result) > 0:
            self.professionals = result
            return True
        return False

    def test_start_chat_session(self):
        if not self.token or not hasattr(self, 'diseases') or not hasattr(self, 'professionals'):
            return False
        disease_id = self.diseases[0]['id']
        professional_id = self.professionals[0]['id']
        result = self.run_test("Start Chat Session", "POST", f"/chat/start?professional_id={professional_id}&disease_id={disease_id}", 200)
        if result and 'session_id' in result and 'questions' in result:
            self.chat_session_id = result['session_id']
            self.chat_questions = result['questions']
            return True
        return False

    def test_submit_chat_answer(self):
        if not hasattr(self, 'chat_session_id') or not hasattr(self, 'chat_questions'):
            return False
        question = self.chat_questions[0]
        answer = question['options'][0] if question.get('options') else "Test Answer"
        data = {
            "session_id": self.chat_session_id,
            "question_id": question['id'],
            "answer": answer
        }
        return self.run_test("Submit Chat Answer", "POST", "/chat/answer", 200, data=data) is not None

    def test_create_appointment(self):
        if not self.token or not hasattr(self, 'diseases') or not hasattr(self, 'professionals') or not hasattr(self, 'chat_session_id'):
            return False
        tomorrow = datetime.now() + timedelta(days=1)
        appointment_data = {
            "professional_id": self.professionals[0]['id'],
            "disease_id": self.diseases[0]['id'],
            "chat_session_id": self.chat_session_id,
            "scheduled_time": tomorrow.isoformat()
        }
        result = self.run_test("Create Appointment", "POST", "/appointments", 200, data=appointment_data)
        if result and 'id' in result:
            self.appointment_id = result['id']
            return True
        return False

    def test_get_user_appointments(self):
        if not self.token:
            return False
        result = self.run_test("Get User Appointments", "GET", "/appointments", 200)
        return result is not None

    def test_database_reset(self):
        return self.run_test("Database Reset", "DELETE", "/reset", 200) is not None

    # --- RUN ALL TESTS ---
    def run_all_tests(self):
        print("🚀 Running Local Backend API Tests")
        tests = [
            ("Root Endpoint", self.test_root_endpoint),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get Diseases", self.test_get_diseases),
            ("Get Single Disease", self.test_get_single_disease),
            ("Get Professionals", self.test_get_professionals_for_disease),
            ("Start Chat Session", self.test_start_chat_session),
            ("Submit Chat Answer", self.test_submit_chat_answer),
            ("Create Appointment", self.test_create_appointment),
            ("Get User Appointments", self.test_get_user_appointments),
            ("Database Reset", self.test_database_reset)
        ]
        for name, func in tests:
            print(f"\n🔍 Running: {name}")
            try:
                func()
            except Exception as e:
                self.log_test(name, False, f"Exception: {str(e)}")
        
        # Summary
        print("\n📊 TEST SUMMARY")
        print(f"Total: {self.tests_run}, Passed: {self.tests_passed}, Failed: {self.tests_run - self.tests_passed}")
        return self.tests_passed == self.tests_run

def main():
    tester = LocalHealthAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
