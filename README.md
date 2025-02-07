# Visualizer + Converter

This is our code for the visualiser and converter for Group E4.

## Project Structure

This project consists of two main parts:

- **Frontend**: Built with Next.js 15 (Located in the `frontend` folder)
- **Backend**: Built with Flask (Located in the `backend` folder)

## Prerequisites

Ensure you have the following installed before proceeding:

- **Node.js** (Recommended: Latest LTS version)
- **npm** (If you want to use Yarn or pnpm or bun or deno, that is also ok)
- **Python 3.10+**
- **pip** (Python package manager)
- **Flask** (Python web framework)

## Running the Frontend

1. Navigate to the `frontend` directory:

   ```sh
   cd frontend
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the Next.js development server:

   ```sh
   npm run dev
   ```

4. The frontend will be available at `http://localhost:3000` by default.

## Running the Backend

1. Navigate to the `backend` directory:

   ```sh
   cd backend
   ```

2. Create a virtual environment (optional but recommended):

   ```sh
   python -m venv venv
   source venv/bin/activate  # On macOS/Linux
   venv\Scripts\activate     # On Windows
   ```

3. Install required dependencies:

   ```sh
   pip install -r requirements.txt
   ```

4. Run the Flask server:

   ```sh
   python3 app.py
   ```

5. The backend should now be running. Note the IP address displayed in the terminal.

## Updating the Frontend API URL

1. Open the file `frontend/dashboard/index.tsx`.
2. Locate the line where the backend API URL is set.
3. Replace the existing IP with the one displayed by Flask when running the backend.
4. Save the changes and restart the frontend server if necessary.

The application should now be fully functional with both the frontend and backend running properly.
