

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="*" element={<Pagina404/>} />
        </Routes>
      </BrowserRouter>
  )
}