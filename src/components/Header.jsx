import { Link } from "react-router-dom";
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <div className="logo">
        💚 <strong>Diego & Yasmin</strong>
      </div>
      <nav>
        <ul>
          <li><Link to="/">Início</Link></li>
          <li><Link to="/presentes">Lista de Presentes</Link></li>
          <li><Link to="/presenca">Confirmar Presença</Link></li>
          <li><Link to="/mural">Mural de Recados</Link></li>
          <li><Link to="/casamento">Casamento</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
