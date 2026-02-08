"""
Startup script for CORE-SE Backend API
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    print("Starting CORE-SE Backend API...")
    print(f"Backend directory: {backend_dir}")
    print(f"Python path: {sys.path[0]}")
    
    # Change to backend directory to ensure proper module resolution
    os.chdir(backend_dir)
    
    # Use subprocess to run uvicorn CLI with reload
    import subprocess
    cmd = [
        sys.executable, "-m", "uvicorn",
        "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload",
        "--log-level", "info"
    ]
    
    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd)
