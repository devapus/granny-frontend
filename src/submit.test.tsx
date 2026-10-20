import { screen, waitFor } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { SUCCESS_MESSAGE } from './pages/SubmitPage'
import { fixtures } from './test/fixtures'
import { API, apiError, server } from './test/server'
import { renderApp } from './test/utils'

type User = ReturnType<typeof userEvent.setup>
const TEXT = 'Grandma taught me to bake bread on Sunday mornings and I still hear her humming.'

async function fillValid(user: User) {
  await user.type(await screen.findByLabelText(/your name/i), 'Jane Doe')
  await user.type(screen.getByRole('textbox', { name: /^email address/i }), 'jane@example.com')
  await user.selectOptions(screen.getByLabelText(/how did you know her/i), 'grandchildren')
  await user.type(screen.getByLabelText(/your tribute/i), TEXT)
  await user.click(screen.getByLabelText(/i understand my tribute will be reviewed/i))
}

function captureSubmissions() {
  const calls: { key: string | null; body: Record<string, unknown> }[] = []
  return calls
}

describe('tribute submission form', () => {
  it('shows validation errors for an empty form and does not call the API', async () => {
    let posted = false
    server.use(
      http.post(`${API}/tributes`, () => {
        posted = true
        return HttpResponse.json({ data: {} })
      }),
    )
    const { user } = renderApp('/submit')
    await user.click(await screen.findByRole('button', { name: /submit tribute/i }))
    expect(await screen.findByText('Please tell us your name.')).toBeInTheDocument()
    expect(screen.getByText('Please enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Please choose how you knew her.')).toBeInTheDocument()
    expect(screen.getByText(/at least 20 characters/i)).toBeInTheDocument()
    expect(screen.getByText('Please confirm to continue.')).toBeInTheDocument()
    expect(posted).toBe(false)
    // focus moves to the first invalid field
    expect(screen.getByLabelText(/your name/i)).toHaveFocus()
  })

  it('validates email format, minimum length from config, and the custom relationship for “Other”', async () => {
    const { user } = renderApp('/submit')
    await user.type(await screen.findByLabelText(/your name/i), 'Jane')
    await user.type(screen.getByRole('textbox', { name: /^email address/i }), 'not-an-email')
    await user.selectOptions(screen.getByLabelText(/how did you know her/i), 'other')
    await user.type(screen.getByLabelText(/your tribute/i), 'too short')
    await user.click(screen.getByLabelText(/i understand my tribute will be reviewed/i))
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))
    expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText(/please write at least 20 characters/i)).toBeInTheDocument()
    expect(screen.getByText('Please tell us how you knew her.')).toBeInTheDocument()
  })

  it('shows a character count and progress toward the minimum', async () => {
    const { user } = renderApp('/submit')
    const box = await screen.findByLabelText(/your tribute/i)
    expect(screen.getByText('0 / 20 minimum')).toBeInTheDocument()
    await user.type(box, '0123456789')
    expect(screen.getByText('10 / 20 minimum')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    await user.type(box, '0123456789ab')
    expect(screen.getByText(/22 \/ 5,000 characters/)).toBeInTheDocument()
  })

  it('submits with an Idempotency-Key header + matching submissionId and shows the success message', async () => {
    const calls = captureSubmissions()
    server.use(
      http.post(`${API}/tributes`, async ({ request }) => {
        calls.push({ key: request.headers.get('idempotency-key'), body: (await request.json()) as Record<string, unknown> })
        return HttpResponse.json({ data: { id: 'new1', status: 'pending', submissionId: 'x' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/submit')
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))

    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument()
    expect(calls).toHaveLength(1)
    const [call] = calls
    expect(call!.key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(call!.body).toMatchObject({
      submissionId: call!.key,
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      relationshipCategory: 'grandchildren',
      tributeText: TEXT,
      photoDisplayPermission: false,
      acknowledgment: true,
    })
  })

  it('keeps the form and reuses the same Idempotency-Key after a recoverable network error', async () => {
    const calls = captureSubmissions()
    let attempt = 0
    server.use(
      http.post(`${API}/tributes`, async ({ request }) => {
        attempt++
        calls.push({ key: request.headers.get('idempotency-key'), body: (await request.json()) as Record<string, unknown> })
        if (attempt === 1) return HttpResponse.error()
        return HttpResponse.json({ data: { id: 'new1', status: 'pending' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/submit')
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/nothing you wrote has been lost/i)
    // form untouched
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Jane Doe')
    expect(screen.getByLabelText(/your tribute/i)).toHaveValue(TEXT)

    await user.click(screen.getByRole('button', { name: /try again/i }))
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument()
    expect(calls).toHaveLength(2)
    expect(calls[0]!.key).toBe(calls[1]!.key)
  })

  it('keeps the form on a 500 and offers retry', async () => {
    server.use(http.post(`${API}/tributes`, () => apiError(500, 'INTERNAL_ERROR', 'Server hiccup')))
    const { user } = renderApp('/submit')
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Server hiccup')
    expect(screen.getByLabelText(/your tribute/i)).toHaveValue(TEXT)
  })

  it('handles 503 STORAGE_NOT_CONFIGURED for photo uploads and lets the visitor submit without photos', async () => {
    const calls = captureSubmissions()
    server.use(
      http.post(`${API}/media/upload-url`, () => apiError(503, 'STORAGE_NOT_CONFIGURED', 'Storage is not configured')),
      http.post(`${API}/tributes`, async ({ request }) => {
        calls.push({ key: request.headers.get('idempotency-key'), body: (await request.json()) as Record<string, unknown> })
        return HttpResponse.json({ data: { id: 'new1', status: 'pending' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/submit')
    await fillValid(user)
    const photo = new File([new Uint8Array([1, 2, 3])], 'me.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByLabelText(/a photo with her/i), photo)
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))

    expect(await screen.findByText(/photo uploads aren’t available right now/i)).toBeInTheDocument()
    expect(calls).toHaveLength(0)
    expect(screen.getByLabelText(/your tribute/i)).toHaveValue(TEXT)

    await user.click(screen.getByRole('button', { name: /submit without photos/i }))
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument()
    expect(calls[0]!.body.grandmotherPhotoMediaId).toBeNull()
  })

  it('uploads photos via the presigned flow and sends the media ids', async () => {
    const calls = captureSubmissions()
    const completed: unknown[] = []
    server.use(
      http.post(`${API}/media/upload-url`, async ({ request }) => {
        const body = (await request.json()) as { category: string }
        return HttpResponse.json(
          {
            data: {
              mediaId: body.category === 'tribute_grandmother' ? 'm-with-her' : 'm-me',
              upload: { url: 'https://storage.example.test/put', method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } },
              completionToken: 'tok',
            },
          },
          { status: 201 },
        )
      }),
      http.put('https://storage.example.test/put', () => new HttpResponse(null, { status: 200 })),
      http.post(`${API}/media/complete`, async ({ request }) => {
        completed.push(await request.json())
        return HttpResponse.json({ data: {} })
      }),
      http.post(`${API}/tributes`, async ({ request }) => {
        calls.push({ key: request.headers.get('idempotency-key'), body: (await request.json()) as Record<string, unknown> })
        return HttpResponse.json({ data: { id: 'new1', status: 'pending' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/submit')
    await fillValid(user)
    await user.upload(screen.getByLabelText(/a photo with her/i), new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' }))
    await user.click(screen.getByLabelText(/you may display my photograph/i))
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))
    expect(await screen.findByText(SUCCESS_MESSAGE)).toBeInTheDocument()
    expect(completed).toEqual([{ mediaId: 'm-with-her', completionToken: 'tok' }])
    expect(calls[0]!.body).toMatchObject({ grandmotherPhotoMediaId: 'm-with-her', contributorPhotoMediaId: null, photoDisplayPermission: true })
  })

  it('rejects unsupported photo types client-side', async () => {
    const { user } = renderApp('/submit')
    await screen.findByLabelText(/your name/i)
    await user.upload(screen.getByLabelText(/a photo of you/i), new File(['x'], 'notes.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(/choose a JPEG, PNG, WebP or AVIF/i)).toBeInTheDocument()
  })

  it('tells the visitor when submissions are closed', async () => {
    server.use(
      http.get(`${API}/public/config`, () =>
        HttpResponse.json({ data: { ...fixtures.config, tributeSubmissionsOpen: false } }),
      ),
    )
    renderApp('/submit')
    expect(await screen.findByText(/not being accepted right now/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit tribute/i })).not.toBeInTheDocument()
  })

  it('generates a fresh key and keeps the text after a 409 idempotency conflict', async () => {
    const keys: (string | null)[] = []
    server.use(
      http.post(`${API}/tributes`, ({ request }) => {
        keys.push(request.headers.get('idempotency-key'))
        if (keys.length === 1) return apiError(409, 'IDEMPOTENCY_CONFLICT', 'Different content')
        return HttpResponse.json({ data: { id: 'n', status: 'pending' } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/submit')
    await fillValid(user)
    await user.click(screen.getByRole('button', { name: /submit tribute/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/press submit again/i)
    await user.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() => expect(keys).toHaveLength(2))
    expect(keys[0]).not.toBe(keys[1])
  })
})
