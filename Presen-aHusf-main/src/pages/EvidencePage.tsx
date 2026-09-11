import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  jsPDF,
} from 'jspdf'

import {
  autoTable,
} from 'jspdf-autotable'

import {
  supabase,
} from '../lib/supabase'


type Evidencia = {
  huddle_id: string
  codigo: string
  titulo: string
  setor_nome: string
  data_local: string
  status: string
  responsavel_nome: string
  iniciado_em: string | null
  encerrado_em: string | null
  total_esperado: number
  total_confirmado: number
  total_presentes: number
  total_atrasados: number
  taxa_participacao: number | string
}


type Participante = {
  user_id: string
  nome: string
  matricula: string
  setor: string

  status:
    | 'PRESENTE'
    | 'ATRASADO'
    | null

  confirmado_em: string | null

  aceite: boolean | null
  aceite_em: string | null
  aceite_texto: string | null
  aceite_versao: string | null
}


type AuditLog = {
  log_id: number
  tabela: string
  acao: string

  usuario_id:
    | string
    | null

  usuario_nome:
    | string
    | null

  ocorrido_em: string
}


export function EvidencePage() {

  const navigate =
    useNavigate()


  const {
    huddleId,
  } =
    useParams()


  const [
    evidencia,
    setEvidencia,
  ] =
    useState<Evidencia | null>(
      null
    )


  const [
    participantes,
    setParticipantes,
  ] =
    useState<Participante[]>(
      []
    )


  const [
    auditoria,
    setAuditoria,
  ] =
    useState<AuditLog[]>(
      []
    )


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    gerandoPdf,
    setGerandoPdf,
  ] =
    useState(false)


  const [
    erro,
    setErro,
  ] =
    useState('')


  const [
    erroPdf,
    setErroPdf,
  ] =
    useState('')


  const [
    ultimoHash,
    setUltimoHash,
  ] =
    useState<string | null>(
      null
    )


  useEffect(() => {

    if (huddleId) {
      carregarEvidencia()
    }

  }, [huddleId])


  async function carregarEvidencia() {

    if (!huddleId) {

      setErro(
        'Huddle não identificado.'
      )

      setLoading(false)

      return

    }


    try {

      setLoading(true)

      setErro('')


      // ============================================
      // RESUMO
      // ============================================

      const resumoResult =
        await supabase
          .rpc(
            'get_evidencia_huddle_lider',
            {
              p_huddle_id:
                huddleId,
            }
          )
          .single()


      if (resumoResult.error) {
        throw resumoResult.error
      }


      // ============================================
      // PARTICIPANTES
      // ============================================

      const participantesResult =
        await supabase
          .rpc(
            'get_evidencia_participantes_lider',
            {
              p_huddle_id:
                huddleId,
            }
          )


      if (participantesResult.error) {
        throw participantesResult.error
      }


      // ============================================
      // AUDITORIA
      // ============================================

      const auditoriaResult =
        await supabase
          .rpc(
            'get_auditoria_huddle_lider',
            {
              p_huddle_id:
                huddleId,
            }
          )


      if (auditoriaResult.error) {
        throw auditoriaResult.error
      }


      const resumo =
        resumoResult.data as Evidencia


      const listaParticipantes =
        (
          participantesResult.data ??
          []
        ) as Participante[]


      const listaAuditoria =
        (
          auditoriaResult.data ??
          []
        ) as AuditLog[]


      setEvidencia(
        resumo
      )


      setParticipantes(
        listaParticipantes
      )


      setAuditoria(
        listaAuditoria
      )

    } catch (error) {

      console.error(
        'Erro ao carregar evidência:',
        error
      )


      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as evidências deste Huddle.'


      setErro(
        mensagem
      )

    } finally {

      setLoading(false)

    }

  }


  function formatarData(
    valor: string
  ) {

    if (!valor) {
      return '—'
    }


    const [
      ano,
      mes,
      dia,
    ] =
      valor.split('-')


    return `${dia}/${mes}/${ano}`

  }


  function formatarDataHora(
    valor: string | null
  ) {

    if (!valor) {
      return '—'
    }


    return new Intl
      .DateTimeFormat(
        'pt-BR',
        {
          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric',

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          timeZone:
            'America/Sao_Paulo',
        }
      )
      .format(
        new Date(valor)
      )

  }


  function traduzirStatus(
    status: string
  ) {

    switch (status) {

      case 'EM_ANDAMENTO':
        return 'Em andamento'

      case 'ENCERRADO':
        return 'Encerrado'

      case 'CANCELADO':
        return 'Cancelado'

      case 'AGENDADO':
        return 'Agendado'

      default:
        return status

    }

  }


  function traduzirAcao(
    valor: string
  ) {

    switch (valor) {

      case 'INSERT':
        return 'Criacao'

      case 'UPDATE':
        return 'Alteracao'

      case 'DELETE':
        return 'Exclusao'

      default:
        return valor

    }

  }


  function traduzirTabela(
    valor: string
  ) {

    switch (valor) {

      case 'huddles':
        return 'Huddle'

      case 'huddle_qrcodes':
        return 'QR Code'

      case 'presencas':
        return 'Presenca'

      case 'evidencias_pdf':
        return 'Evidencia PDF'

      default:
        return valor

    }

  }


  function statusParticipante(
    participante: Participante
  ) {

    if (
      participante.status ===
      'PRESENTE'
    ) {
      return 'PRESENTE'
    }


    if (
      participante.status ===
      'ATRASADO'
    ) {
      return 'ATRASADO'
    }


    return 'AUSENTE'

  }


  async function calcularSha256(
    arquivo: Blob
  ) {

    const buffer =
      await arquivo.arrayBuffer()


    const hashBuffer =
      await window.crypto
        .subtle
        .digest(
          'SHA-256',
          buffer
        )


    const bytes =
      Array.from(
        new Uint8Array(
          hashBuffer
        )
      )


    const hash =
      bytes
        .map(
          byte =>
            byte
              .toString(16)
              .padStart(
                2,
                '0'
              )
        )
        .join('')


    return hash

  }


  async function gerarRelatorioPDF() {

    if (!evidencia) {
      return
    }


    try {

      setGerandoPdf(true)

      setErroPdf('')

      setUltimoHash(null)


      const doc =
        new jsPDF({
          orientation:
            'portrait',

          unit:
            'mm',

          format:
            'a4',
        })


      // ============================================
      // IDENTIFICADORES
      // ============================================

      const agora =
        new Date()


      const geradoEmTexto =
        new Intl
          .DateTimeFormat(
            'pt-BR',
            {
              day:
                '2-digit',

              month:
                '2-digit',

              year:
                'numeric',

              hour:
                '2-digit',

              minute:
                '2-digit',

              second:
                '2-digit',

              timeZone:
                'America/Sao_Paulo',
            }
          )
          .format(
            agora
          )


      const identificador =
        `EVD-${evidencia.codigo}`


      doc.setProperties({
        title:
          `Evidencia ${evidencia.codigo}`,

        subject:
          'Relatorio de evidencia de Huddle',

        author:
          'Sistema de Huddles',

        creator:
          'Sistema de Huddles',
      })


      // ============================================
      // PÁGINA 1
      // ============================================

      doc.setFillColor(
        49,
        87,
        229
      )


      doc.rect(
        0,
        0,
        210,
        36,
        'F'
      )


      doc.setTextColor(
        255,
        255,
        255
      )


      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        18
      )


      doc.text(
        'RELATORIO DE EVIDENCIA',
        15,
        16
      )


      doc.setFont(
        'helvetica',
        'normal'
      )


      doc.setFontSize(
        10
      )


      doc.text(
        'Huddle Diario - Registro de participacao',
        15,
        24
      )


      doc.setTextColor(
        16,
        24,
        40
      )


      doc.setFontSize(
        9
      )


      doc.text(
        `Identificador: ${identificador}`,
        15,
        47
      )


      doc.text(
        `Gerado em: ${geradoEmTexto}`,
        15,
        53
      )


      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        14
      )


      doc.text(
        evidencia.titulo,
        15,
        66
      )


      doc.setFont(
        'helvetica',
        'normal'
      )


      doc.setFontSize(
        9
      )


      doc.text(
        `Codigo: ${evidencia.codigo}`,
        15,
        73
      )


      // ============================================
      // DADOS PRINCIPAIS
      // ============================================

      autoTable(
        doc,
        {
          startY:
            82,

          theme:
            'grid',

          head: [
            [
              'Campo',
              'Informacao',
            ],
          ],

          body: [
            [
              'Data',
              formatarData(
                evidencia.data_local
              ),
            ],

            [
              'Setor',
              evidencia.setor_nome,
            ],

            [
              'Responsavel',
              evidencia.responsavel_nome,
            ],

            [
              'Status',
              traduzirStatus(
                evidencia.status
              ),
            ],

            [
              'Inicio',
              formatarDataHora(
                evidencia.iniciado_em
              ),
            ],

            [
              'Encerramento',
              formatarDataHora(
                evidencia.encerrado_em
              ),
            ],
          ],

          styles: {
            font:
              'helvetica',

            fontSize:
              9,

            cellPadding:
              3,
          },

          headStyles: {
            fillColor:
              [
                81,
                69,
                205,
              ],

            textColor:
              [
                255,
                255,
                255,
              ],
          },

          columnStyles: {
            0: {
              cellWidth:
                45,

              fontStyle:
                'bold',
            },
          },

          margin: {
            left:
              15,

            right:
              15,
          },
        }
      )


      // ============================================
      // INDICADORES
      // ============================================

      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        13
      )


      doc.text(
        'Indicadores',
        15,
        151
      )


      autoTable(
        doc,
        {
          startY:
            158,

          theme:
            'grid',

          head: [
            [
              'Esperados',
              'Confirmados',
              'No horario',
              'Atrasados',
              'Participacao',
            ],
          ],

          body: [
            [
              String(
                evidencia.total_esperado
              ),

              String(
                evidencia.total_confirmado
              ),

              String(
                evidencia.total_presentes
              ),

              String(
                evidencia.total_atrasados
              ),

              `${Number(
                evidencia.taxa_participacao
              ).toFixed(1)}%`,
            ],
          ],

          styles: {
            halign:
              'center',

            font:
              'helvetica',

            fontSize:
              8,

            cellPadding:
              3,
          },

          headStyles: {
            fillColor:
              [
                242,
                244,
                247,
              ],

            textColor:
              [
                52,
                64,
                84,
              ],
          },

          margin: {
            left:
              15,

            right:
              15,
          },
        }
      )


      // ============================================
      // DECLARAÇÃO
      // ============================================

      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        10
      )


      doc.text(
        'Declaracao de rastreabilidade',
        15,
        193
      )


      doc.setFont(
        'helvetica',
        'normal'
      )


      doc.setFontSize(
        9
      )


      const textoRastreabilidade =
        doc.splitTextToSize(
          'Este relatorio foi gerado a partir dos registros armazenados no Sistema de Huddles. Os horarios apresentados sao provenientes dos registros mantidos no banco de dados do sistema.',
          180
        )


      doc.text(
        textoRastreabilidade,
        15,
        201
      )


      // ============================================
      // PÁGINA 2
      // PARTICIPANTES
      // ============================================

      doc.addPage()


      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        16
      )


      doc.text(
        '1. Evidencia de Presenca',
        15,
        20
      )


      doc.setFont(
        'helvetica',
        'normal'
      )


      doc.setFontSize(
        9
      )


      doc.text(
        `${evidencia.codigo} - ${evidencia.setor_nome}`,
        15,
        27
      )


      const linhasParticipantes =
        participantes.map(
          participante => [

            participante.nome,

            participante.matricula,

            statusParticipante(
              participante
            ),

            participante.confirmado_em
              ? formatarDataHora(
                  participante.confirmado_em
                )
              : 'Nao registrado',

            participante.aceite
              ? 'SIM'
              : 'NAO',

          ]
        )


      autoTable(
        doc,
        {
          startY:
            35,

          theme:
            'striped',

          head: [
            [
              'Colaborador',
              'Matricula',
              'Status',
              'Confirmacao',
              'Aceite',
            ],
          ],

          body:
            linhasParticipantes,

          styles: {
            font:
              'helvetica',

            fontSize:
              7.5,

            cellPadding:
              2.5,

            overflow:
              'linebreak',
          },

          headStyles: {
            fillColor:
              [
                49,
                87,
                229,
              ],

            textColor:
              [
                255,
                255,
                255,
              ],
          },

          columnStyles: {
            0: {
              cellWidth:
                48,
            },

            1: {
              cellWidth:
                25,
            },

            2: {
              cellWidth:
                25,
            },

            3: {
              cellWidth:
                58,
            },

            4: {
              cellWidth:
                18,
            },
          },

          margin: {
            left:
              15,

            right:
              15,
          },
        }
      )


      // ============================================
      // PÁGINA 3
      // ACEITES
      // ============================================

      doc.addPage()


      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        16
      )


      doc.text(
        '2. Aceites Digitais',
        15,
        20
      )


      doc.setFont(
        'helvetica',
        'normal'
      )


      doc.setFontSize(
        9
      )


      doc.text(
        'Confirmacoes eletronicamente registradas pelos participantes.',
        15,
        27
      )


      const participantesComAceite =
        participantes.filter(
          participante =>
            participante.aceite ===
            true
        )


      if (
        participantesComAceite.length ===
        0
      ) {

        doc.text(
          'Nenhum aceite digital registrado neste Huddle.',
          15,
          40
        )

      } else {

        const linhasAceites =
          participantesComAceite.map(
            participante => [

              participante.nome,

              participante.matricula,

              participante.aceite_versao
                ??
                '-',

              formatarDataHora(
                participante.aceite_em
              ),

              participante.aceite_texto
                ??
                'Aceite registrado.',

            ]
          )


        autoTable(
          doc,
          {
            startY:
              35,

            theme:
              'grid',

            head: [
              [
                'Colaborador',
                'Matricula',
                'Versao',
                'Data/Hora',
                'Declaracao',
              ],
            ],

            body:
              linhasAceites,

            styles: {
              font:
                'helvetica',

              fontSize:
                7,

              cellPadding:
                2.5,

              valign:
                'top',

              overflow:
                'linebreak',
            },

            headStyles: {
              fillColor:
                [
                  18,
                  183,
                  106,
                ],

              textColor:
                [
                  255,
                  255,
                  255,
                ],
            },

            columnStyles: {
              0: {
                cellWidth:
                  37,
              },

              1: {
                cellWidth:
                  22,
              },

              2: {
                cellWidth:
                  14,
              },

              3: {
                cellWidth:
                  38,
              },

              4: {
                cellWidth:
                  69,
              },
            },

            margin: {
              left:
                15,

              right:
                15,
            },
          }
        )

      }


      // ============================================
      // PÁGINA 4
      // AUDITORIA
      // ============================================

      doc.addPage()


      doc.setFont(
        'helvetica',
        'bold'
      )


      doc.setFontSize(
        16
      )


      doc.text(
        '3. Rastreabilidade',
        15,
        20
      )


      doc.setFont(
        'helvetica',
        'normal'
      )


      doc.setFontSize(
        9
      )


      doc.text(
        'Eventos registrados pelo sistema relacionados a este Huddle.',
        15,
        27
      )


      if (
        auditoria.length ===
        0
      ) {

        doc.text(
          'Nenhum evento de auditoria encontrado.',
          15,
          40
        )

      } else {

        const linhasAuditoria =
          auditoria.map(
            log => [

              String(
                log.log_id
              ),

              traduzirAcao(
                log.acao
              ),

              traduzirTabela(
                log.tabela
              ),

              log.usuario_nome
                ??
                'Sistema',

              formatarDataHora(
                log.ocorrido_em
              ),

            ]
          )


        autoTable(
          doc,
          {
            startY:
              35,

            theme:
              'grid',

            head: [
              [
                'ID',
                'Acao',
                'Registro',
                'Usuario',
                'Data/Hora',
              ],
            ],

            body:
              linhasAuditoria,

            styles: {
              font:
                'helvetica',

              fontSize:
                7.5,

              cellPadding:
                2.5,

              overflow:
                'linebreak',
            },

            headStyles: {
              fillColor:
                [
                  81,
                  69,
                  205,
                ],

              textColor:
                [
                  255,
                  255,
                  255,
                ],
            },

            columnStyles: {
              0: {
                cellWidth:
                  15,
              },

              1: {
                cellWidth:
                  27,
              },

              2: {
                cellWidth:
                  33,
              },

              3: {
                cellWidth:
                  45,
              },

              4: {
                cellWidth:
                  60,
              },
            },

            margin: {
              left:
                15,

              right:
                15,
            },
          }
        )

      }


      // ============================================
      // RODAPÉS
      // ============================================

      const totalPaginas =
        doc.getNumberOfPages()


      for (
        let pagina = 1;
        pagina <= totalPaginas;
        pagina++
      ) {

        doc.setPage(
          pagina
        )


        doc.setDrawColor(
          228,
          231,
          236
        )


        doc.line(
          15,
          282,
          195,
          282
        )


        doc.setFont(
          'helvetica',
          'normal'
        )


        doc.setFontSize(
          7
        )


        doc.setTextColor(
          102,
          112,
          133
        )


        doc.text(
          identificador,
          15,
          288
        )


        doc.text(
          `Pagina ${pagina} de ${totalPaginas}`,
          195,
          288,
          {
            align:
              'right',
          }
        )

      }


      // ============================================
      // NOME DO ARQUIVO
      // ============================================

      const codigoSeguro =
        evidencia.codigo
          .replace(
            /[^a-zA-Z0-9-_]/g,
            '_'
          )


      const nomeArquivo =
        `Evidencia_${codigoSeguro}.pdf`


      // ============================================
      // GERAR BLOB
      // ============================================

      const pdfBlob =
        doc.output(
          'blob'
        )


      // ============================================
      // CALCULAR SHA-256
      // ============================================

      const hashSha256 =
        await calcularSha256(
          pdfBlob
        )


      console.log(
        'SHA-256:',
        hashSha256
      )


      // ============================================
      // REGISTRAR NO SUPABASE
      // ============================================

      const {
        data: registroHash,
        error: erroHash,
      } =
        await supabase
          .rpc(
            'registrar_evidencia_pdf',
            {
              p_huddle_id:
                evidencia.huddle_id,

              p_hash_sha256:
                hashSha256,

              p_nome_arquivo:
                nomeArquivo,

              p_tamanho_bytes:
                pdfBlob.size,
            }
          )
          .single()


      if (erroHash) {

        console.error(
          'Erro ao registrar hash:',
          erroHash
        )

        throw erroHash

      }


      console.log(
        'Evidência registrada:',
        registroHash
      )


      setUltimoHash(
        hashSha256
      )


      // ============================================
      // BAIXAR O MESMO BLOB
      // ============================================

      const url =
        URL.createObjectURL(
          pdfBlob
        )


      const link =
        document.createElement(
          'a'
        )


      link.href =
        url


      link.download =
        nomeArquivo


      document.body
        .appendChild(
          link
        )


      link.click()


      link.remove()


      window.setTimeout(
        () => {

          URL.revokeObjectURL(
            url
          )

        },
        1000
      )


    } catch (error) {

      console.error(
        'Erro ao gerar PDF:',
        error
      )


      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar ou registrar o relatório PDF.'


      setErroPdf(
        mensagem
      )

    } finally {

      setGerandoPdf(false)

    }

  }


  // ==============================================
  // LOADING
  // ==============================================

  if (loading) {

    return (

      <div className="loading-page">

        <div className="spinner" />

        <p>
          Carregando evidências...
        </p>

      </div>

    )

  }


  // ==============================================
  // ERRO PRINCIPAL
  // ==============================================

  if (
    erro ||
    !evidencia
  ) {

    return (

      <main className="evidence-page">

        <div className="invalid-qr">

          <div>
            ⚠️
          </div>


          <h2>
            Evidência indisponível
          </h2>


          <p>

            {
              erro ||
              'Registro não encontrado.'
            }

          </p>


          <button
            type="button"
            className="primary-button"
            onClick={() =>
              navigate(
                '/lider/historico'
              )
            }
          >

            Voltar ao histórico

          </button>

        </div>

      </main>

    )

  }


  return (

    <main className="evidence-page">


      {/* CABEÇALHO */}

      <header className="history-header">

        <button
          type="button"
          onClick={() =>
            navigate(
              '/lider/historico'
            )
          }
        >
          ←
        </button>


        <div>

          <span>
            EVIDÊNCIA DE AUDITORIA
          </span>


          <h1>
            {evidencia.titulo}
          </h1>


          <p>
            {evidencia.codigo}
          </p>

        </div>

      </header>


      {/* DADOS PRINCIPAIS */}

      <section className="evidence-main-card">


        <div className="evidence-approved">

          <div>
            ✓
          </div>

          <span>
            Registro localizado
          </span>

        </div>


        <div className="evidence-grid">


          <div>

            <span>
              Data
            </span>

            <strong>

              {
                formatarData(
                  evidencia.data_local
                )
              }

            </strong>

          </div>


          <div>

            <span>
              Setor
            </span>

            <strong>
              {evidencia.setor_nome}
            </strong>

          </div>


          <div>

            <span>
              Responsável
            </span>

            <strong>
              {evidencia.responsavel_nome}
            </strong>

          </div>


          <div>

            <span>
              Status
            </span>

            <strong>

              {
                traduzirStatus(
                  evidencia.status
                )
              }

            </strong>

          </div>


          <div>

            <span>
              Início
            </span>

            <strong>

              {
                formatarDataHora(
                  evidencia.iniciado_em
                )
              }

            </strong>

          </div>


          <div>

            <span>
              Encerramento
            </span>

            <strong>

              {
                formatarDataHora(
                  evidencia.encerrado_em
                )
              }

            </strong>

          </div>


        </div>

      </section>


      {/* KPIS */}

      <section className="evidence-kpis">


        <div>

          <span>
            Esperados
          </span>

          <strong>
            {evidencia.total_esperado}
          </strong>

        </div>


        <div>

          <span>
            Confirmados
          </span>

          <strong>
            {evidencia.total_confirmado}
          </strong>

        </div>


        <div>

          <span>
            Presença
          </span>

          <strong>

            {
              Number(
                evidencia.taxa_participacao
              ).toFixed(1)
            }%

          </strong>

        </div>


        <div>

          <span>
            Atrasados
          </span>

          <strong>
            {evidencia.total_atrasados}
          </strong>

        </div>


      </section>


      {/* PARTICIPANTES */}

      <section className="evidence-section">


        <div className="evidence-section-title">

          <span>
            PARTICIPANTES
          </span>

          <h2>
            Evidência de presença
          </h2>

        </div>


        <div className="evidence-participants">


          {
            participantes.length ===
            0
              ? (

                <p
                  className="audit-empty"
                  style={{
                    padding:
                      '20px',
                  }}
                >

                  Nenhum participante
                  registrado.

                </p>

              )
              : (

                participantes.map(
                  participante => (

                    <div
                      className="evidence-participant"
                      key={
                        participante.user_id
                      }
                    >


                      <div className="participant-avatar">

                        {
                          participante.nome
                            .charAt(0)
                            .toUpperCase()
                        }

                      </div>


                      <div className="evidence-participant-info">

                        <strong>
                          {participante.nome}
                        </strong>


                        <span>

                          Matrícula{' '}

                          {
                            participante.matricula
                          }

                        </span>


                        {
                          participante.confirmado_em
                          &&
                          (

                            <small>

                              Confirmado em{' '}

                              {
                                formatarDataHora(
                                  participante
                                    .confirmado_em
                                )
                              }

                            </small>

                          )
                        }

                      </div>


                      {
                        participante.status
                          ? (

                            <div
                              className={
                                participante.status ===
                                'ATRASADO'
                                  ? 'evidence-status evidence-late'
                                  : 'evidence-status'
                              }
                            >

                              ✓

                              <span>

                                {
                                  participante.status
                                }

                              </span>

                            </div>

                          )
                          : (

                            <div className="evidence-absent">

                              AUSENTE

                            </div>

                          )
                      }


                    </div>

                  )
                )

              )
          }


        </div>

      </section>


      {/* ACEITES */}

      <section className="evidence-section">


        <div className="evidence-section-title">

          <span>
            ACEITE DIGITAL
          </span>

          <h2>
            Confirmações registradas
          </h2>

        </div>


        {
          participantes.filter(
            participante =>
              participante.aceite ===
              true
          ).length === 0
            ? (

              <p
                className="audit-empty"
                style={{
                  padding:
                    '20px',
                }}
              >

                Nenhum aceite registrado.

              </p>

            )
            : (

              participantes
                .filter(
                  participante =>
                    participante.aceite ===
                    true
                )
                .map(
                  participante => (

                    <div
                      className="acceptance-record"
                      key={
                        `aceite-${participante.user_id}`
                      }
                    >


                      <div>

                        <strong>

                          ✓ {participante.nome}

                        </strong>


                        <span>

                          Versão{' '}

                          {
                            participante.aceite_versao
                            ??
                            '—'
                          }

                        </span>

                      </div>


                      <p>

                        {
                          participante.aceite_texto
                          ??
                          'Aceite registrado.'
                        }

                      </p>


                      <small>

                        Registrado em{' '}

                        {
                          formatarDataHora(
                            participante.aceite_em
                          )
                        }

                      </small>


                    </div>

                  )
                )

            )
        }


      </section>


      {/* AUDITORIA */}

      <section className="evidence-section">


        <div className="evidence-section-title">

          <span>
            RASTREABILIDADE
          </span>

          <h2>
            Histórico de alterações
          </h2>

        </div>


        <div className="audit-timeline">


          {
            auditoria.length ===
            0
              ? (

                <p className="audit-empty">

                  Nenhum evento
                  registrado.

                </p>

              )
              : (

                auditoria.map(
                  log => (

                    <div
                      className="audit-row"
                      key={
                        log.log_id
                      }
                    >


                      <div className="audit-dot" />


                      <div>

                        <strong>

                          {
                            traduzirAcao(
                              log.acao
                            )
                          }

                        </strong>


                        <span>

                          {
                            traduzirTabela(
                              log.tabela
                            )
                          }

                        </span>


                        <small>

                          {
                            log.usuario_nome
                            ??
                            'Sistema'
                          }

                          {' • '}

                          {
                            formatarDataHora(
                              log.ocorrido_em
                            )
                          }

                        </small>

                      </div>


                    </div>

                  )
                )

              )
          }


        </div>

      </section>


      {/* BOTÃO PDF */}

      <button
        type="button"
        className="primary-button evidence-pdf-placeholder"
        disabled={
          gerandoPdf
        }
        onClick={
          gerarRelatorioPDF
        }
      >

        {
          gerandoPdf
            ? 'Gerando relatório...'
            : '📄 Gerar relatório PDF'
        }

      </button>


      {/* ERRO DO PDF */}

      {
        erroPdf
        &&
        (

          <div className="scanner-error">

            ⚠️ {erroPdf}

          </div>

        )
      }


      {/* HASH */}

      {
        ultimoHash
        &&
        (

          <section className="pdf-hash-result">


            <div className="pdf-hash-icon">

              ✓

            </div>


            <div>

              <strong>
                Evidência registrada
              </strong>


              <span>
                SHA-256
              </span>


              <code>
                {ultimoHash}
              </code>

            </div>


          </section>

        )
      }


    </main>

  )

}