import { FaBoxOpen } from "react-icons/fa";
import css from "../../pages/DashboardProfessor/DashboardProfessor_38.module.css";

export default function EstadoVazioProfessor({ texto }) {
    return (
        <div className={css.estadoVazio}>
            <FaBoxOpen />
            <p>{texto}</p>
        </div>
    );
}
