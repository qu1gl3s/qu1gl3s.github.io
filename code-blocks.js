function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
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
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code to clipboard');
  button.setAttribute('aria-live', 'polite');
  wrapper.prepend(button);

  button.addEventListener('click', async () => {
    try {
      await copyText(code.textContent ?? '');
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Copy failed';
    }

    window.setTimeout(() => {
      button.textContent = 'Copy';
    }, 1600);
  });
});
