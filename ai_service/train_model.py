"""
To run this script, we highly recommend using Google Colab or a cloud GPU environment.
PyTorch and CUDA are required for training, which are typically pre-installed in Colab.

Instructions for Google Colab:
1. Open Google Colab (colab.research.google.com) and create a new notebook.
2. Change runtime type to GPU (Runtime -> Change runtime type -> Hardware accelerator: GPU).
3. Upload `dataset.csv` to the Colab environment.
4. Run the following command in a cell to install dependencies:
   !pip install transformers datasets onnx optimum
5. Copy and paste this script into a cell and run it!
"""

import os
import warnings
import pandas as pd
import torch
from datasets import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 1. Load the dataset
print("Loading dataset...")
dataset_path = os.path.join(BASE_DIR, "dataset.csv")
df = pd.read_csv(dataset_path)

# Create HuggingFace Dataset
hg_dataset = Dataset.from_pandas(df)

# Split into train/test
hg_dataset = hg_dataset.train_test_split(test_size=0.2, seed=42)
train_dataset = hg_dataset["train"]
eval_dataset = hg_dataset["test"]

# 2. Load tokenizer and model
MODEL_NAME = "distilbert-base-uncased"
print(f"Loading {MODEL_NAME}...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, 
    num_labels=12,
    id2label={
        0: "Academics", 1: "Admissions", 2: "Career Services", 3: "Disciplinary",
        4: "Facilities", 5: "Fees & Finance", 6: "General", 7: "Health & Wellness",
        8: "Housing", 9: "International", 10: "Registration", 11: "Student Life"
    },
    label2id={
        "Academics": 0, "Admissions": 1, "Career Services": 2, "Disciplinary": 3,
        "Facilities": 4, "Fees & Finance": 5, "General": 6, "Health & Wellness": 7,
        "Housing": 8, "International": 9, "Registration": 10, "Student Life": 11
    }
)

# 3. Tokenize dataset
def tokenize_function(examples):
    return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

print("Tokenizing data...")
train_dataset = train_dataset.map(tokenize_function, batched=True)
eval_dataset = eval_dataset.map(tokenize_function, batched=True)

# 4. Set up Trainer
training_args = TrainingArguments(
    output_dir=os.path.join(BASE_DIR, "model_output"),
    eval_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=8,
    per_device_eval_batch_size=8,
    num_train_epochs=5,
    weight_decay=0.01,
    dataloader_pin_memory=torch.cuda.is_available(),
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
)

# 5. Train!
print("Starting training...")
trainer.train()

# 6. Save Model
print("Training complete! Saving model...")
fine_tuned_dir = os.path.join(BASE_DIR, "fine_tuned_campus_model")
model.save_pretrained(fine_tuned_dir)
tokenizer.save_pretrained(fine_tuned_dir)

# 7. Export to ONNX for local inference in app.py
print("Exporting fine-tuned model to ONNX for local app.py inference...")
onnx_dir = os.path.join(BASE_DIR, "onnx_model")
os.makedirs(onnx_dir, exist_ok=True)
dummy_input = tokenizer("Hello campus assistant", return_tensors="pt")
model.eval()

with warnings.catch_warnings():
    warnings.filterwarnings("ignore")
    torch.onnx.export(
        model,
        (dummy_input["input_ids"], dummy_input["attention_mask"]),
        os.path.join(onnx_dir, "model.onnx"),
        input_names=["input_ids", "attention_mask"],
        output_names=["logits"],
        dynamic_axes={
            "input_ids": {0: "batch_size", 1: "sequence_length"},
            "attention_mask": {0: "batch_size", 1: "sequence_length"},
            "logits": {0: "batch_size"},
        },
        opset_version=14,
        dynamo=False,
    )
tokenizer.save_pretrained(onnx_dir)
print(f"Done! Local ONNX model and tokenizer are saved in {onnx_dir} and ready for app.py.")
