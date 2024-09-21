import React, { useRef, useState } from 'react';

interface TokenInputFormProps {
  closeForm: () => void;
}

const TokenInputForm: React.FC<TokenInputFormProps> = ({ closeForm }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    chrome.runtime.sendMessage({ type: 'set_user', rolo: token });
    closeForm();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bg-white p-5 shadow-md rounded-md border-2 border-black"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001, // Make sure it's above other UI components in this container
        width: '300px',
      }}>
      <input
        ref={inputRef}
        name="token"
        type="text"
        placeholder="Enter your token"
        className="w-full p-2 mb-4 border rounded"
        id="input-token"
        onChange={event => setToken(event.target.value)}
        onKeyDown={e => e.stopPropagation()}
        onKeyUp={e => e.stopPropagation()}
        onKeyPress={e => e.stopPropagation()}
        onKeyDownCapture={e => e.stopPropagation()}
        onKeyUpCapture={e => e.stopPropagation()}
        onKeyPressCapture={e => e.stopPropagation()}
        autoFocus={true}
      />
      <div className="flex justify-between">
        <button type="submit" className="px-4 py-2 bg-green-500 text-white rounded">
          Submit
        </button>
        <button
          type="button"
          onClick={() => window.open('https://voxelvideo.com/settings', '_blank')}
          className="px-4 py-2 bg-blue-500 text-white rounded">
          Don't have a token?
        </button>
      </div>
    </form>
  );
};

export default TokenInputForm;
