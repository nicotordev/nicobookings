import "./style.css";

type AuthUser = {
  username: string;
  role: string;
};

type AuthResponse = {
  user: AuthUser;
};

export async function withAuth(
  onAuthenticated: (user: AuthUser) => void | Promise<void>,
): Promise<void> {
  const app = document.querySelector<HTMLElement>(".app-shell");

  if (!app) {
    throw new Error("Could not find the admin application shell.");
  }

  app.hidden = true;
  const login = createLoginScreen();
  const logoutButton = document.querySelector<HTMLButtonElement>("#logout-button");

  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Logout failed with HTTP ${response.status}.`);
      }

      window.location.reload();
    } catch {
      logoutButton.disabled = false;
      login.setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      login.show();
      app.hidden = true;
    }
  });

  login.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    login.setError("");
    login.setLoading(true);

    const formData = new FormData(login.form);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });

      if (!response.ok) {
        login.setError(
          response.status === 401
            ? "Usuario o contraseña incorrectos."
            : "No se pudo iniciar sesión. Inténtalo de nuevo.",
        );
        return;
      }

      const { user } = (await response.json()) as AuthResponse;
      await showAdmin(app, login, user, onAuthenticated);
    } catch {
      login.setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      login.setLoading(false);
    }
  });

  try {
    const response = await fetch("/api/auth/me", {
      credentials: "same-origin",
    });

    if (response.ok) {
      const { user } = (await response.json()) as AuthResponse;
      await showAdmin(app, login, user, onAuthenticated);
      return;
    }

    if (response.status !== 401) {
      login.setError("No se pudo validar la sesión. Inténtalo de nuevo.");
    }
  } catch {
    login.setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
  }

  login.show();
}

async function showAdmin(
  app: HTMLElement,
  login: LoginScreen,
  user: AuthUser,
  onAuthenticated: (user: AuthUser) => void | Promise<void>,
): Promise<void> {
  login.hide();
  app.hidden = false;

  const username = document.querySelector<HTMLElement>("#admin-username");
  username?.replaceChildren(document.createTextNode(user.username));

  await onAuthenticated(user);
}

type LoginScreen = {
  form: HTMLFormElement;
  show: () => void;
  hide: () => void;
  setError: (message: string) => void;
  setLoading: (loading: boolean) => void;
};

function createLoginScreen(): LoginScreen {
  const root = document.createElement("main");
  root.className = "auth-screen";
  root.hidden = true;
  root.innerHTML = `
    <section class="auth-card" aria-labelledby="auth-title">
      <a class="auth-brand" href="/" aria-label="NicoBookings">
        <span class="brand-mark">N</span>
        <span>Nico<span class="brand-light">Bookings</span></span>
      </a>
      <p class="auth-eyebrow">PANEL DE ADMINISTRACIÓN</p>
      <h1 id="auth-title">Bienvenido de nuevo</h1>
      <p class="auth-description">Inicia sesión para administrar tus reservas.</p>
      <form class="auth-form">
        <label for="auth-username">Usuario</label>
        <input id="auth-username" name="username" type="text" autocomplete="username" required maxlength="128" />
        <label for="auth-password">Contraseña</label>
        <input id="auth-password" name="password" type="password" autocomplete="current-password" required maxlength="1024" />
        <p class="auth-error" role="alert" aria-live="polite"></p>
        <button class="auth-submit" type="submit">Iniciar sesión</button>
      </form>
      <p class="auth-secure"><span aria-hidden="true">◇</span> Conexión segura</p>
    </section>
  `;
  document.body.append(root);

  const form = root.querySelector<HTMLFormElement>("form");
  const error = root.querySelector<HTMLParagraphElement>(".auth-error");
  const submit = root.querySelector<HTMLButtonElement>(".auth-submit");

  if (!form || !error || !submit) {
    throw new Error("Could not initialize the admin login form.");
  }

  return {
    form,
    show: () => {
      root.hidden = false;
    },
    hide: () => {
      root.hidden = true;
    },
    setError: (message) => {
      error.textContent = message;
    },
    setLoading: (loading) => {
      submit.disabled = loading;
      submit.textContent = loading ? "Iniciando sesión…" : "Iniciar sesión";
    },
  };
}
