import { describe, expect, it } from 'vitest'
import { idDoYoutube, normalizarUrlDeVideo, origemDoVideo } from './video'

describe('normalizarUrlDeVideo', () => {
  it('aceita http e https', () => {
    expect(normalizarUrlDeVideo('https://youtube.com/watch?v=abc')).toContain('https://youtube.com/')
    expect(normalizarUrlDeVideo('http://exemplo.com/v')).toContain('http://exemplo.com/')
  })

  it('assume https quando o esquema nao vem — e como se copia de fato', () => {
    expect(normalizarUrlDeVideo('youtube.com/watch?v=abc')).toBe('https://youtube.com/watch?v=abc')
    expect(normalizarUrlDeVideo('  youtu.be/xyz  ')).toBe('https://youtu.be/xyz')
  })

  it('RECUSA javascript: — o link vai para um href e executaria ao clicar', () => {
    expect(normalizarUrlDeVideo('javascript:alert(1)')).toBeNull()
    expect(normalizarUrlDeVideo('JavaScript:alert(1)')).toBeNull()
    expect(normalizarUrlDeVideo('  javascript:void(0)  ')).toBeNull()
  })

  it('recusa outros esquemas perigosos ou inuteis', () => {
    expect(normalizarUrlDeVideo('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(normalizarUrlDeVideo('file:///etc/passwd')).toBeNull()
    expect(normalizarUrlDeVideo('vbscript:msgbox(1)')).toBeNull()
  })

  it('completa esquema ausente, mas nunca corrige esquema invalido', () => {
    // O contraste e o ponto: sem esquema, assume https (conveniencia real);
    // com esquema invalido, recusa. Quem digitou `javascript:` digitou de
    // proposito, e completar em cima disso viraria a tentativa em link valido.
    expect(normalizarUrlDeVideo('youtube.com/watch?v=x')).toMatch(/^https:/)
    expect(normalizarUrlDeVideo('javascript:alert(1)')).toBeNull()
  })

  it('recusa vazio e texto que nao e endereco', () => {
    expect(normalizarUrlDeVideo('')).toBeNull()
    expect(normalizarUrlDeVideo('   ')).toBeNull()
    expect(normalizarUrlDeVideo('raspagem de tesoura')).toBeNull()
    expect(normalizarUrlDeVideo('localhost')).toBeNull()
  })

  it('recusa URL sem host', () => {
    expect(normalizarUrlDeVideo('https://')).toBeNull()
    expect(normalizarUrlDeVideo('http:///caminho')).toBeNull()
  })
})

describe('idDoYoutube', () => {
  it('extrai de watch?v=', () => {
    expect(idDoYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extrai de youtu.be', () => {
    expect(idDoYoutube('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('extrai de shorts e embed', () => {
    expect(idDoYoutube('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(idDoYoutube('https://youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('ignora parametros extras como t= e list=', () => {
    expect(idDoYoutube('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ')
    expect(idDoYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123')).toBe('dQw4w9WgXcQ')
  })

  it('devolve null para outras origens — o app aceita, so nao enfeita', () => {
    expect(idDoYoutube('https://vimeo.com/12345')).toBeNull()
    expect(idDoYoutube('https://instagram.com/p/abc')).toBeNull()
  })

  it('devolve null para id de tamanho errado', () => {
    expect(idDoYoutube('https://youtu.be/curto')).toBeNull()
  })

  it('nao aceita host parecido com o do YouTube', () => {
    // youtube.com.exemplo.net nao e o YouTube.
    expect(idDoYoutube('https://youtube.com.exemplo.net/watch?v=dQw4w9WgXcQ')).toBeNull()
  })
})

describe('origemDoVideo', () => {
  it('devolve o host sem www', () => {
    expect(origemDoVideo('https://www.youtube.com/watch?v=x')).toBe('youtube.com')
    expect(origemDoVideo('vimeo.com/1')).toBe('vimeo.com')
  })

  it('devolve null para link invalido', () => {
    expect(origemDoVideo('javascript:alert(1)')).toBeNull()
  })
})
