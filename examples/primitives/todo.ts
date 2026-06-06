import { html, createSignal, defineComponent, BaexElement } from '../../src/framework/index.js';

class TodoListElement extends BaexElement {
  private todos = createSignal('todos', ['Learn BAEX', 'Build SPA']);

  render() {
    return html`
      <ul>
        ${(this.todos as any).value.map((todo: string) => html`<li>${todo}</li>`)}
      </ul>
      <input id="new-todo" type="text" />
      <button @click=${() => this.addTodo()}>Add</button>
    `;
  }

  addTodo() {
    const input = this.querySelector('#new-todo') as HTMLInputElement;
    if (input.value) {
      (this.todos as any).value = [...(this.todos as any).value, input.value];
      input.value = '';
    }
  }
}

defineComponent('baex-todo', TodoListElement);
