import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { getAccessToken } from "../auth/session";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export default function MLDashboard() {
  const context = useOutletContext();
  const darkMode = context?.darkMode ?? true;
  
  const [modelInfo, setModelInfo] = useState(null);
  const [featureImportance, setFeatureImportance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // Theme classes
  const cardClass = darkMode ? "bg-white/5 border-white/10" : "bg-white border-gray-200";
  const textClass = darkMode ? "text-white" : "text-gray-900";
  const textMutedClass = darkMode ? "text-white/60" : "text-gray-500";

  useEffect(() => {
    loadModelInfo();
    loadFeatureImportance();
  }, []);

  const loadModelInfo = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/ml/model/info`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setModelInfo(data.model_info);
      }
    } catch (err) {
      console.error("Error loading model info:", err);
    }
  };

  const loadFeatureImportance = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/ml/model/feature-importance`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFeatureImportance(data.feature_importance);
      }
    } catch (err) {
      console.error("Error loading feature importance:", err);
    }
  };

  const trainModel = async () => {
    if (!confirm("Train the ML model? This may take a few minutes.")) return;
    
    setTraining(true);
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/api/ml/model/train?limit=1000`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.message}`);
        loadModelInfo();
        loadFeatureImportance();
      } else {
        alert("❌ Training failed");
      }
    } catch (err) {
      alert("❌ Training error: " + err.message);
    } finally {
      setTraining(false);
    }
  };

  const testPrediction = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      
      // Sample transaction
      const sampleTx = {
        amount: 5000,
        country: "US",
        merchant: "Amazon",
        channel: "web",
        device: "mobile",
        card_type: "visa"
      };
      
      const response = await fetch(`${API_BASE}/api/ml/predict`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(sampleTx)
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrediction(data.prediction);
      }
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-semibold ${textClass}`}>ML Model Dashboard</h1>
          <p className={textMutedClass}>Machine Learning fraud detection model management</p>
        </div>
        <button
          onClick={trainModel}
          disabled={training}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 text-sm font-medium"
        >
          {training ? "Training..." : "🎓 Train Model"}
        </button>
      </div>

      {/* Model Status */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Model Status</h2>
        {modelInfo ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <div className={`text-sm ${textMutedClass}`}>Model Type</div>
              <div className={`text-lg font-semibold ${textClass}`}>
                {modelInfo.model_type || "Not Loaded"}
              </div>
            </div>
            <div>
              <div className={`text-sm ${textMutedClass}`}>Status</div>
              <div className={`text-lg font-semibold ${modelInfo.model_loaded ? "text-emerald-500" : "text-rose-500"}`}>
                {modelInfo.model_loaded ? "✅ Loaded" : "❌ Not Loaded"}
              </div>
            </div>
            <div>
              <div className={`text-sm ${textMutedClass}`}>Model Path</div>
              <div className={`text-sm font-mono ${textClass}`}>
                {modelInfo.model_path}
              </div>
            </div>
          </div>
        ) : (
          <div className={textMutedClass}>Loading model information...</div>
        )}
      </div>

      {/* Feature Importance */}
      {featureImportance && Object.keys(featureImportance).length > 0 && (
        <div className={`rounded-xl border p-6 ${cardClass}`}>
          <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Feature Importance</h2>
          <div className="space-y-3">
            {Object.entries(featureImportance).map(([feature, importance], index) => (
              <div key={feature}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${textClass}`}>
                    {index + 1}. {feature}
                  </span>
                  <span className={`text-sm ${textMutedClass}`}>
                    {(importance * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${importance * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Prediction */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>Test Prediction</h2>
        <p className={`${textMutedClass} mb-4`}>
          Test the ML model with a sample transaction
        </p>
        <button
          onClick={testPrediction}
          disabled={loading}
          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white px-4 py-2 text-sm font-medium"
        >
          {loading ? "Predicting..." : "🔮 Test Prediction"}
        </button>

        {prediction && (
          <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className={`text-xs ${textMutedClass}`}>Risk Score</div>
                <div className={`text-2xl font-bold ${textClass}`}>
                  {prediction.risk_score}%
                </div>
              </div>
              <div>
                <div className={`text-xs ${textMutedClass}`}>Risk Level</div>
                <div className={`text-lg font-semibold ${
                  prediction.risk_level === "HIGH" ? "text-rose-500" :
                  prediction.risk_level === "MEDIUM" ? "text-amber-500" :
                  "text-emerald-500"
                }`}>
                  {prediction.risk_level}
                </div>
              </div>
              <div>
                <div className={`text-xs ${textMutedClass}`}>Confidence</div>
                <div className={`text-lg font-semibold ${textClass}`}>
                  {(prediction.confidence * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className={`text-xs ${textMutedClass}`}>Model</div>
                <div className={`text-sm ${textClass}`}>
                  {prediction.model_version}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className={`rounded-xl border p-6 ${cardClass}`}>
        <h2 className={`text-lg font-semibold mb-4 ${textClass}`}>How It Works</h2>
        <div className={`space-y-3 ${textMutedClass}`}>
          <div className="flex items-start gap-3">
            <span className="text-blue-500">1.</span>
            <p>The ML model analyzes transaction features like amount, merchant, country, and time</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-500">2.</span>
            <p>Random Forest algorithm learns patterns from historical fraud cases</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-500">3.</span>
            <p>Model predicts fraud probability (0-100%) for each new transaction</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-blue-500">4.</span>
            <p>High-risk transactions (≥70%) automatically create investigation cases</p>
          </div>
        </div>
      </div>
    </div>
  );
}