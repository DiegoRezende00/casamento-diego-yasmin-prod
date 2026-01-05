import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css";

const Header = () => {
  const [menuAberto, setMenuAberto] = useState(false);

  const toggleMenu = () => {
    setMenuAberto(!menuAberto);
  };

  return (
    <header className="header-container">
      <div className="header-logo">
        <Link to="/" className="logo-text">
          Y & D
        </Link>
      </div>
        <nav className={`header-nav ${menuAberto ? "ativo" : ""}`}>
          <Link to="/" onClick={() => setMenuAberto(false)}>Inicio</Link>
          <Link to="/presentes" onClick={() => setMenuAberto(false)}>Lista de Presentes</Link>
          <Link to="/presenca" onClick={() => setMenuAberto(false)}>Confirmar Presença</Link>
          <Link to="/mural" onClick={() => setMenuAberto(false)}>Mural de Recados</Link>
          <Link to="/casamento" onClick={() => setMenuAberto(false)}>Casamento</Link>
        </nav>

        <div
          className={`menu-toggle ${menuAberto ? "aberto" : ""}`}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </header>
  );
};

export default Header;
