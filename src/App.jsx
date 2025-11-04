import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Presenca from "./pages/Presenca";
import Presentes from "./pages/Presentes";
import Mural from "./pages/Mural";

function App() {
  return (
    <Router>
      <div>
        {/* HEADER */}
        <header
          style={{
            backgroundColor: "#3A6351", // verde elegante
            padding: "15px",
            textAlign: "center",
          }}
        >
          <nav>
            <Link
              to="/"
              style={{
                color: "white", // letras brancas
                margin: "0 15px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "18px",
              }}
              onMouseOver={(e) => (e.target.style.color = "#C8E4B2")} // verde claro ao passar o mouse
              onMouseOut={(e) => (e.target.style.color = "white")}
            >
              Início
            </Link>
            <Link
              to="/presenca"
              style={{
                color: "white",
                margin: "0 15px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "18px",
              }}
              onMouseOver={(e) => (e.target.style.color = "#C8E4B2")}
              onMouseOut={(e) => (e.target.style.color = "white")}
            >
              Confirmar Presença
            </Link>
            <Link
              to="/presentes"
              style={{
                color: "white",
                margin: "0 15px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "18px",
              }}
              onMouseOver={(e) => (e.target.style.color = "#C8E4B2")}
              onMouseOut={(e) => (e.target.style.color = "white")}
            >
              Lista de Presentes
            </Link>
            <Link
              to="/mural"
              style={{
                color: "white",
                margin: "0 15px",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: "18px",
              }}
              onMouseOver={(e) => (e.target.style.color = "#C8E4B2")}
              onMouseOut={(e) => (e.target.style.color = "white")}
            >
              Mural de Recados
            </Link>
          </nav>
        </header>

        {/* ROTAS */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/presenca" element={<Presenca />} />
          <Route path="/presentes" element={<Presentes />} />
          <Route path="/mural" element={<Mural />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
