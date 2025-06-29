import { render } from 'solid-js/web'
import { Route, Router } from '@solidjs/router'
import App from './App'

render(
  () => (
    <Router>
      <Route path={'/'} component={App} />
    </Router>
  ),
  document.getElementById('root')!,
)

