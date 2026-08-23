function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.className = 'copy-fallback';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error('Copy failed'));
}

document.querySelectorAll('.article-body pre').forEach((pre) => {
  const code = pre.querySelector('code');
  if (!code) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'code-block';
  pre.before(wrapper);
  wrapper.append(pre);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy-code';
  button.textContent = '⧉';
  button.setAttribute('aria-label', 'Copy code to clipboard');
  button.setAttribute('aria-live', 'polite');
  button.title = 'Copy code';
  wrapper.prepend(button);

  button.addEventListener('click', async () => {
    try {
      await copyText(code.textContent ?? '');
      button.textContent = '✓';
      button.classList.add('is-copied');
      button.setAttribute('aria-label', 'Code copied');
      button.title = 'Copied';
    } catch {
      button.textContent = '!';
      button.setAttribute('aria-label', 'Copy failed');
      button.title = 'Copy failed';
    }

    window.setTimeout(() => {
      button.textContent = '⧉';
      button.classList.remove('is-copied');
      button.setAttribute('aria-label', 'Copy code to clipboard');
      button.title = 'Copy code';
    }, 1600);
  });
});
