import css from './Input.module.css'
import {IMaskInput} from "react-imask";

export default function Input({tipoInp, label, htmlFor, placeholder, classe = '', value, funcao, maxlength, checado, opcoeslabel, opcoes, disabled=false, minLength, mask, required=false, obrigatorio="Nao", margin ='auto'}) {


    if (classe == 'metade') {
        if (tipoInp == 'radio') {
            return (
                <div className={"d-flex flex-column my-3 text-center " + css.metade}>
                    <input type={tipoInp} id={htmlFor} name={htmlFor} value={value} onChange={funcao} checked={checado} />
                    <label htmlFor={htmlFor} className='mx-2'>{label}</label>
                </div>
            )
        }
        return (
            <div className={"d-flex flex-column my-3 " + css.metade}>
                {obrigatorio == "Sim" && (
                    <span className={css.campoObrigatorio}>* Campo Obrigatório</span>
                )}
                <label htmlFor={htmlFor}>{label}</label>
                <input type={tipoInp} placeholder={placeholder} id={htmlFor} name={htmlFor} className={"d-block w-100 rounded px-2 py-1 " + css.input} value={value} onChange={funcao} required={required}/>
            </div>
        )
    } else if (tipoInp == 'select') {
        return (
            <div className={`d-flex w-75 m-auto my-3 flex-column`}>
                {obrigatorio == "Sim" && (
                    <span className={css.campoObrigatorio}>* Campo Obrigatório</span>
                )}
                <label htmlFor={htmlFor}>{label}</label>
                <select
                    id={htmlFor}
                    onChange={funcao}
                    className={"d-block w-100 rounded px-2 py-1 " + css.input}

                    value={value || ""}
                >
                    <option value="" disabled>
                        {opcoeslabel}
                    </option>

                    {Array.isArray(opcoes) &&
                        opcoes.map((opcao) => (
                            <option
                                key={opcao.id_tipo_ong}
                                value={opcao.id_tipo_ong}
                            >
                                {opcao.nome}
                            </option>
                        ))
                    }
                </select>
            </div>
        )
    } else if (tipoInp == 'textarea') {
        return (
            <div className={`d-flex flex-column w-75 m-auto my-3`} >
                {obrigatorio == "Sim" && (
                    <span className={css.campoObrigatorio}>* Campo Obrigatório</span>
                )}
                <label htmlFor={htmlFor}>{label}</label>
                <textarea id={htmlFor} name={htmlFor} value={value} onChange={funcao} placeholder={placeholder} className={"d-block w-100 rounded px-2 py-1 " + css.input}/>
            </div>
        )
    }

    return (
        <div className={`d-flex flex-column w-100 ${margin === "auto" && "m-auto my-3 "} `} >
            {obrigatorio == "Sim" && (
                <span className={css.campoObrigatorio}>* Campo Obrigatório</span>
            )}
            <label htmlFor={htmlFor}>{label} </label>

            {mask === "cnpj" ? (
                <IMaskInput
                    mask={"00.000.000-0000-00"}
                    placeholder={"Digite o CNPJ"}
                    onChange={funcao}
                    value={value}
                    className={"w-100 d-block rounded px-2 py-1 " + css.input}
                    id={htmlFor}
                    name={htmlFor}
                />
            ) : mask === "cpf" ? (
                <IMaskInput
                    mask={"000.000.000-00"}
                    placeholder={"Digite o Cpf"}
                    onChange={funcao}
                    value={value}
                    className={"w-100 d-block rounded px-2 py-1 " + css.input}
                    id={htmlFor}
                    name={htmlFor}
                />
            ) : mask === "telefone" ? (
                <IMaskInput
                    mask={"(00) 00000-0000"}
                    placeholder={"Digite o telefone"}
                    onChange={funcao}
                    value={value}
                    className={"w-100 d-block rounded px-2 py-1 " + css.input}
                    id={htmlFor}
                    name={htmlFor}
                />
            ) : (<input type={tipoInp} placeholder={placeholder} id={htmlFor} name={htmlFor}
                       className={`w-100 d-block rounded px-2 py-1 ` + css.input}
                       value={value}
                       onChange={funcao}
                       maxLength={maxlength}
                       minLength={minLength}
                       disabled={disabled}
                       required={required}/>
            )}
        </div>
    )
}
