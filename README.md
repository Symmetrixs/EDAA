# Workshop-2-Automated-Inspection-Report

An automated inspection report system built with React + Vite frontend and FastAPI backend, featuring AI-powered defect detection for vessel inspections.

## Features

- 🚢 Vessel management and inspection tracking
- 🤖 AI-powered defect detection using YOLO
- 📊 Automated report generation (PDF/DOCX)
- 👥 Multi-role user management (Admin/Inspector)
- 📷 Photo upload and analysis
- 📈 Analytics and statistics dashboard
- 🔔 Real-time notifications

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- Axios
- Supabase Client

### Backend
- FastAPI
- Python 3.x
- Supabase
- Ultralytics YOLO
- OpenCV
- ReportLab (PDF generation)

## Prerequisites

- Node.js (v16+)
- Python (v3.8+)
- pip
- Supabase account

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd Workshop-2-Automated-Inspection-Report
```

### 2. Backend Setup
```bash
cd Backend
pip install -r requirements.txt
```

Create a `.env` file in the Backend directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 3. Frontend Setup
```bash
npm install
```

Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Running the Application

### Start Backend Server
```bash
cd Backend
uvicorn main:app --reload
```

Backend will run on `http://localhost:8000`

### Start Frontend Development Server
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Backend
- `uvicorn main:app --reload` - Start development server with auto-reload
- `uvicorn main:app` - Start production server

## Project Structure
```
├── Backend/
│   ├── main.py
│   ├── admin.py
│   ├── auth.py
│   ├── ai_detection.py
│   ├── inspection.py
│   ├── photo.py
│   ├── report.py
│   └── requirements.txt
├── src/
│   ├── components/
│   ├── pages/
│   ├── utils/
│   └── main.jsx
├── public/
└── package.json
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Docker Support

Build and run with Docker:
```bash
docker build -t inspection-app .
docker run -p 8000:8000 inspection-app
```

For production:
```bash
docker build -f Dockerfile.prod -t inspection-app-prod .
docker run -p 8000:8000 inspection-app-prod
```

## React + Vite Configuration

This project uses Vite for fast development and optimized builds:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) - Uses Babel for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) - Uses SWC for Fast Refresh

### Expanding ESLint Configuration

For production applications, consider using TypeScript with type-aware lint rules. Check the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for TypeScript integration.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue in the repository.