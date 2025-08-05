import requests

JAVA_SERVER_URL = "http://localhost:8080/api/database/processes"  # Update port if needed

def test_processes_endpoint():
    try:
        response = requests.get(JAVA_SERVER_URL)
        print("Status Code:", response.status_code)
        print("Response JSON:", response.json())
        print("Full Response:", response.text)  # Add this line
        assert response.status_code == 200, "Request failed!"
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_processes_endpoint()
