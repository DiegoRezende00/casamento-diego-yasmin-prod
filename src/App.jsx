import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Header from "./components/Header";
import Casamento from "./pages/Casamento";
import Presentes from "./pages/Presentes";
import Presenca from "./pages/Presenca";
import Mural from "./pages/Mural";
import "./index.css";

function App() {
  return (
    <Router>
      <Header />
      <div className="main-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/casamento" element={<Casamento />} />
          <Route path="/presentes" element={<Presentes />} />
          <Route path="/presenca" element={<Presenca />} />
          <Route path="/mural" element={<Mural />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
