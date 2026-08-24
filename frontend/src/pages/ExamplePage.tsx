import { useCallback, useEffect, useState } from 'react'
import { createExample, listExamples } from '../api/exampleApi'
import type { FormEvent } from 'react'
import type { Example } from '../types/example'

export function ExamplePage() {
  const [examples, setExamples] = useState<Example[]>([])
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadExamples = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      setExamples(await listExamples())
    } catch (caughtError) {
      setError(toMessage(caughtError))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(loadExamples)
  }, [loadExamples])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('이름을 입력해 주세요.')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      await createExample(trimmedName)
      setName('')
      await loadExamples()
    } catch (caughtError) {
      setError(toMessage(caughtError))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="example-page">
      <section className="example-panel" aria-labelledby="page-title">
        <p className="eyebrow">Disposable sample domain</p>
        <h1 id="page-title">Example API</h1>
        <p className="intro">Vite의 <code>/api</code> 프록시를 통해 Spring 예제 CRUD API를 호출합니다.</p>

        <form className="create-form" onSubmit={handleSubmit}>
          <label htmlFor="example-name">새 예제 이름</label>
          <div className="form-row">
            <input
              id="example-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: Hackathon starter"
              disabled={isCreating}
            />
            <button type="submit" disabled={isCreating}>
              {isCreating ? '생성 중…' : '생성'}
            </button>
          </div>
        </form>

        <div className="list-header">
          <h2>예제 목록</h2>
          <button type="button" className="secondary-button" onClick={() => void loadExamples()} disabled={isLoading || isCreating}>
            새로고침
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {isLoading ? (
          <p className="status" aria-live="polite">목록을 불러오는 중…</p>
        ) : examples.length === 0 ? (
          <p className="status">아직 생성된 예제가 없습니다.</p>
        ) : (
          <ul className="example-list">
            {examples.map((example) => (
              <li key={example.id}>
                <strong>{example.name}</strong>
                <dl>
                  <div><dt>ID</dt><dd>{example.id}</dd></div>
                  <div><dt>Created at</dt><dd>{example.createdAt}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
}
