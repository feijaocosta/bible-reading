// Short message at the bottom of the screen ("Link copiado", errors...).
class Toast {
  message = $state('');
  #timer;
  show(message, ms = 2600) {
    this.message = message;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => (this.message = ''), ms);
  }
}
export const toast = new Toast();
