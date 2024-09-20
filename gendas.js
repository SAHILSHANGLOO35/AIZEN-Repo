const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Connect to MongoDB
mongoose
  .connect("mongodb+srv://aditya:aizen299@cluster0.uiyks.mongodb.net/DATASET", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Define DNA schema and model
const dnaSchema = new mongoose.Schema({
  sequence: String,
  disease: String,
});
const DNA = mongoose.model("DNA", dnaSchema);

// Read CSV file and insert into MongoDB
const filePath = path.join(__dirname, "Genome data set-KtVQpXF9IbO75SNjQ9ya0bbRRInrLC.csv");
try {
  const fileContent = fs.readFileSync(filePath, "utf8");
  const rows = fileContent.split("\n");
  rows.forEach((row, index) => {
    if (index === 0) return; // Skip header
    const [sequence, disease] = row.split(",");
    const dnaRecord = new DNA({
      sequence: sequence.trim(),
      disease: disease.trim(),
    });
    dnaRecord.save()
      .then(() => console.log(`Record inserted: ${sequence} - ${disease}`))
      .catch((err) => console.error("Error saving to database:", err));
  });
  console.log("All records processed.");
} catch (err) {
  console.error("Error reading the file:", err);
}

// k-NN algorithm
async function knn(input, k = 3) {
  const dataset = await DNA.find();
  const distances = dataset.map((item) => ({
    sequence: item.sequence,
    disease: item.disease,
    distance: hammingDistance(input, item.sequence),
  }));

  distances.sort((a, b) => a.distance - b.distance);
  const nearestNeighbors = distances.slice(0, k);
  const diseaseCounts = {};
  nearestNeighbors.forEach((neighbor) => {
    diseaseCounts[neighbor.disease] = (diseaseCounts[neighbor.disease] || 0) + 1;
  });

  return Object.entries(diseaseCounts)
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);
}

function hammingDistance(seq1, seq2) {
  let distance = 0;
  for (let i = 0; i < seq1.length; i++) {
    if (seq1[i] !== seq2[i]) distance++;
  }
  return distance;
}

// API to predict diseases
app.post("/api/predict", async (req, res) => {
  const { dnaSequence } = req.body;

  if (!dnaSequence || dnaSequence.length !== 16) {
    return res.status(400).json({ error: "Please provide a valid 16-character DNA sequence" });
  }

  try {
    const predictedDiseases = await knn(dnaSequence);
    
    // Ensure there's at least one predicted disease
    const diseaseString = predictedDiseases.length > 0 ? predictedDiseases.join(", ") : "Unknown Disease";

    // Create a new record with the sequence and predicted diseases
    const dnaRecord = new DNA({
      sequence: dnaSequence,
      disease: diseaseString, // Store diseases as a string
    });

    await dnaRecord.save(); // Save to DB
    res.json({ diseases: predictedDiseases }); // Respond with predicted diseases
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve the frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});