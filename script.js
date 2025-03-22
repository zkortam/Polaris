// script.js

// Fetch the contents of data.txt and display it in the <pre> element.
fetch('data.txt')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not OK');
    }
    return response.text();
  })
  .then(text => {
    document.getElementById('dataDisplay').innerText = text;
  })
  .catch(error => {
    document.getElementById('dataDisplay').innerText = 'Error loading data.txt: ' + error;
  });
