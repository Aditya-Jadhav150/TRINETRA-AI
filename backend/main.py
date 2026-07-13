import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    # Fallback to 8000 if port variable not provided by Catalyst
    port = int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
