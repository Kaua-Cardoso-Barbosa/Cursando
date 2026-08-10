from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, nullable=True)
    foto = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False)

    cursos_criados = relationship("Curso", back_populates="professor")
    matriculas = relationship("Matricula", back_populates="aluno")
    aulas_vistas = relationship("AulaVista", back_populates="aluno")

class Curso(Base):
    __tablename__ = "cursos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descricao = Column(String(500), nullable=False)
    foto = Column(String(255), nullable=True)
    status = Column(String(20), default="arquivado")
    professor_id = Column(Integer, ForeignKey("usuarios.id"))

    professor = relationship("Usuario", back_populates="cursos_criados")
    aulas = relationship("Aula", back_populates="curso", cascade="all, delete-orphan")
    matriculas = relationship("Matricula", back_populates="curso")

class Aula(Base):
    __tablename__ = "aulas"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(150), nullable=False)
    descricao = Column(String(500), nullable=False)
    video = Column(String(255), nullable=False)
    curso_id = Column(Integer, ForeignKey("cursos.id"))

    curso = relationship("Curso", back_populates="aulas")
    visualizacoes = relationship("AulaVista", back_populates="aula", cascade="all, delete-orphan")

class Matricula(Base):
    __tablename__ = "matriculas"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("usuarios.id"))
    curso_id = Column(Integer, ForeignKey("cursos.id"))

    aluno = relationship("Usuario", back_populates="matriculas")
    curso = relationship("Curso", back_populates="matriculas")

class AulaVista(Base):
    __tablename__ = "aulas_vistas"

    id = Column(Integer, primary_key=True, index=True)
    aluno_id = Column(Integer, ForeignKey("usuarios.id"))
    aula_id = Column(Integer, ForeignKey("aulas.id"))

    aluno = relationship("Usuario", back_populates="aulas_vistas")
    aula = relationship("Aula", back_populates="visualizacoes")