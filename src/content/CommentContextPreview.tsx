interface CommentContextPreviewProps {
  commentContext: any;
  onRemove?: () => void;
  clearable?: boolean;
}

export default function CommentContextPreview({
  commentContext,
  onRemove,
  clearable = true,
}: CommentContextPreviewProps) {
  return (
    <div className={`ai-ext-comment-context-badge ${clearable ? 'clearable' : ''}`}>
      <div className='ai-ext-comment-context-info'>
        <span className='ai-ext-comment-context-user'>
          <img
            src={
              commentContext.selectedComment.createdUser.nulabAccount.iconUrl
            }
            alt={commentContext.selectedComment.createdUser.name}
            className='ai-ext-comment-context-avatar'
          />
          <span className='ai-ext-comment-context-icon'>💬</span>
          <span className='ai-ext-comment-context-name'>
            {commentContext.selectedComment.createdUser.name}
          </span>
          •
          <span className='ai-ext-comment-context-timestamp'>
            {new Date(commentContext.selectedComment.created).toLocaleString()}
          </span>
        </span>
        <div
          className='ai-ext-comment-context-content'
          title={commentContext.selectedComment.content}
        >
          {commentContext.selectedComment.content}
        </div>
      </div>
      {clearable && onRemove && (
        <button
          className='ai-ext-comment-context-remove'
          onClick={onRemove}
          title='Remove comment context'
        >
          ×
        </button>
      )}
    </div>
  );
}
