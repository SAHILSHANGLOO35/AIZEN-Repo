const express = require('express');
const cors = require('cors');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load the dataset
const dataset = [];
fs.createReadStream(path.join(__dirname, 'Genome data set-KtVQpXF9IbO75SNjQ9ya0bbRRInrLC.csv'))
  .pipe(csv())
  .on('data', (row) => {
    dataset.push(row);
  })
  .on('data', (row) => {
    dataset.push(row);
  })
  .on('end', () => {
    console.log('Dataset loaded successfully');
  });

// k-NN algorithm
function knn(input, k = 3) {
  const distances = dataset.map(item => ({
    sequence: item['DNA SEQUENCE'],
    disease: item['DISEASES'],
    distance: hammingDistance(input, item['DNA SEQUENCE'])
  }));

  distances.sort((a, b) => a.distance - b.distance);
  const nearestNeighbors = distances.slice(0, k);

  const diseaseCounts = {};
  nearestNeighbors.forEach(neighbor => {
    diseaseCounts[neighbor.disease] = (diseaseCounts[neighbor.disease] || 0) + 1;
  });

  const predictedDiseases = Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  return predictedDiseases;
}

// Hamming distance function
function hammingDistance(seq1, seq2) {
  let distance = 0;
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) distance++;
  }
  return distance;
}

app.post('/api/predict', (req, res) => {
  const { dnaSequence } = req.body;

  if (!dnaSequence || dnaSequence.length !== 16 || !/^[ATCG]+$/.test(dnaSequence)) {
    return res.status(400).json({ error: 'Invalid DNA sequence' });
  }

  const predictedDiseases = knn(dnaSequence);
  res.json({ diseases: predictedDiseases });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(Server running on port ${port});
});