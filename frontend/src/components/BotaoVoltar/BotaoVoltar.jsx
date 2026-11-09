import { FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import Button from '../Button/Button.jsx';
import css from './BotaoVoltar.module.css';

export default function BotaoVoltar({ to, onClick, children = 'Voltar', disabled = false, emLinha = false }) {
    const conteudo = <><FaArrowLeft aria-hidden="true" /><span>{children}</span></>;
    const container = `${css.container} ${emLinha ? css.emLinha : ''}`;
    if (to) return <Link to={to} onClick={onClick} className={`${container} ${css.botao}`}>{conteudo}</Link>;
    return <span className={container}>
        <Button tipo="button" texto={conteudo} className={css.botao} onClick={onClick} disabled={disabled} />
    </span>;
}
