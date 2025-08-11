## 🧠 AI Agent Cursor – Comment Enhancer

### 🎯 Mục tiêu

Thêm nút "Chat with AI" ẩn vào mỗi comment trên trang ticket Backlog. Nút sẽ hiện khi hover vào comment và cho phép người dùng mở chat box AI với nội dung comment đã chọn.

---

### 🧩 Cấu trúc HTML của Backlog comment section (hiện tại)

```html
<ul class="comment-list__items">
  <li class="comment-item">
    <button>...</button>
    <div>...</div>
  </li>
  <li class="comment-item">
    <button>...</button>
    <div>...</div>
  </li>
</ul>
```

---

### ⚙️ Cách tiếp cận

#### 1. Inject CSS (ẩn/hiện nút khi hover)

```css
/* Ẩn nút theo mặc định */
button.ai-ext-add-comment-chat {
  display: none;
  margin-left: 8px;
  cursor: pointer;
}

/* Hiện nút khi hover comment-item */
li.comment-item:hover button.ai-ext-add-comment-chat {
  display: inline-block;
}
```

> ✅ Nút được inject sẵn nhưng chỉ hiện khi hover vào `li.comment-item`.

---

#### 2. Hàm inject nút vào mỗi `li.comment-item`

```ts
function injectChatButton(commentItem: HTMLElement) {
  // Tránh inject trùng lặp
  if (commentItem.querySelector('button.ai-ext-add-comment-chat')) return;

  const btn = document.createElement('button');
  btn.dataset.commentId = commentItem.dataset.id;
  const iconImg = document.createElement('img');
  iconImg.src = chrome.runtime.getURL('icons/icon.svg');
  iconImg.alt = 'Thêm comment vào chatbox';
  btn.className = 'ai-ext-add-comment-chat';
  btn.appendChild(iconImg);
  btn.addEventListener('click', openAIChatboxWithContext);

  commentItem.appendChild(btn);
}
```

---

#### 3. Hàm xử lý inject toàn bộ comment hiện tại

```ts
function injectAllCommentButtons() {
  const commentItems = document.querySelectorAll('ul.comment-list__items > li.comment-item');
  commentItems.forEach(item => injectChatButton(item as HTMLElement));
}
```

---

#### 4. Quan sát DOM với `MutationObserver`

```ts
function observeCommentList() {
  const commentList = document.querySelector('ul.comment-list__items');
  if (!commentList) return;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.matches('li.comment-item')) {
          injectChatButton(node);
        }
      });
    });
  });

  observer.observe(commentList, { childList: true, subtree: false });
}
```

---

#### 5. Hàm khởi tạo tổng thể

```ts
function initAIAgentOnComments() {
  injectAllCommentButtons(); // inject khi load lần đầu
  observeCommentList(); // theo dõi thêm các comment mới
}
```

Gọi hàm `initAIAgentOnComments()` trong content script khi extension load vào trang:

```ts
document.addEventListener('DOMContentLoaded', initAIAgentOnComments);
```

---

#### 6. Hàm mở chatbox với nội dung comment

Giả định bạn đã có chatbox của extension, bạn có thể truyền nội dung như sau:

```ts
function openAIChatboxWithContext(event: Event) {
  const commentId = (event.target as HTMLElement).dataset.commentId;
  console.log('openAIChatboxWithContext', commentId);
}
```

Extension side panel sẽ lắng nghe message `OPEN_CHATBOX` và mở chatbox với nội dung đã truyền.

---

### ✅ Kết quả kỳ vọng

* Mỗi comment sẽ có nút `💬 AI Chat` hiện khi hover.
* Người dùng có thể click vào để mở chat box với nội dung của comment.
* Khi có comment mới được thêm (qua AJAX), nút vẫn được tự động gắn nhờ `MutationObserver`.
