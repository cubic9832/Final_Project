"""Train the separate height/high-value model using the shared audited training pipeline."""
import argparse
from pathlib import Path
from vehicle_matching.height_scenario_model import FEATURE_NAMES, HeightScenarioRanker, encode_height_scenario
from vehicle_matching.train_ui_scenario import train

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--data',required=True,type=Path);p.add_argument('--output',required=True,type=Path);p.add_argument('--epochs',type=int,default=30);a=p.parse_args()
    train(a.data,a.output,a.epochs,feature_names=FEATURE_NAMES,encoder=encode_height_scenario,ranker_type=HeightScenarioRanker)
