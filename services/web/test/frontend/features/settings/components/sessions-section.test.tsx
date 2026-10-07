import { expect } from 'chai'
import { screen, render } from '@testing-library/react'

import SessionsSection from '../../../../../frontend/js/features/settings/components/sessions-section'

describe('<SessionsSection />', function () {
  it('shows link to sessions', async function () {
    render(<SessionsSection />)

    expect(screen.getByText('Browsers currently signed in to your account.')).to
      .exist
    expect(screen.getByText('1 active session')).to.exist

    const link = screen.getByRole('link', {
      name: 'Manage sessions',
    })

    expect(link.getAttribute('href')).to.equal('/user/sessions')
  })
})
