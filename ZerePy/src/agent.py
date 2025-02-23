import json
import random
import time
import logging
import os
from pathlib import Path
from dotenv import load_dotenv
from src.connection_manager import ConnectionManager
from src.helpers import print_h_bar
from src.action_handler import execute_action
import src.actions.solana_actions
from datetime import datetime

REQUIRED_FIELDS = ["name", "bio", "traits", "examples", "loop_delay", "config", "tasks"]

logger = logging.getLogger("agent")

class ZerePyAgent:
    def __init__(
            self,
            agent_name: str
    ):
        try:
            agent_path = Path("agents") / f"{agent_name}.json"
            agent_dict = json.load(open(agent_path, "r"))

            missing_fields = [field for field in REQUIRED_FIELDS if field not in agent_dict]
            if missing_fields:
                raise KeyError(f"Missing required fields: {', '.join(missing_fields)}")

            self.name = agent_dict["name"]
            self.bio = agent_dict["bio"]
            self.traits = agent_dict["traits"]
            self.examples = agent_dict["examples"]
            self.example_accounts = agent_dict["example_accounts"]
            self.loop_delay = agent_dict["loop_delay"]
            self.connection_manager = ConnectionManager(agent_dict["config"])
            self.use_time_based_weights = agent_dict["use_time_based_weights"]
            self.time_based_multipliers = agent_dict["time_based_multipliers"]

            self.is_llm_set = False

            # Cache for system prompt
            self._system_prompt = None

            # Extract loop tasks
            self.tasks = agent_dict.get("tasks", [])
            self.task_weights = [task.get("weight", 0) for task in self.tasks]
            self.logger = logging.getLogger("agent")

            # Set up empty agent state
            self.state = {}
            self._setup_llm_provider()
        except Exception as e:
            logger.error("Could not load ZerePy agent")
            raise e

    def _setup_llm_provider(self):
        # Get first available LLM provider and its model
        llm_providers = self.connection_manager.get_model_providers()
        if not llm_providers:
            raise ValueError("No configured LLM provider found")
        self.model_provider = llm_providers[0]

    def _construct_system_prompt(self) -> str:
        """Construct the system prompt from agent configuration"""
        if self._system_prompt is None:
            prompt_parts = []
            prompt_parts.extend(self.bio)

            if self.traits:
                prompt_parts.append("\nYour key traits are:")
                prompt_parts.extend(f"- {trait}" for trait in self.traits)

            self._system_prompt = "\n".join(prompt_parts)

        return self._system_prompt
    
    def _adjust_weights_for_time(self, current_hour: int, task_weights: list) -> list:
        weights = task_weights.copy()
        
        # Reduce tweet frequency during night hours (1 AM - 5 AM)
        if 1 <= current_hour <= 5:
            weights = [
                weight * self.time_based_multipliers.get("tweet_night_multiplier", 0.4) if task["name"] == "post-tweet"
                else weight
                for weight, task in zip(weights, self.tasks)
            ]
            
        # Increase engagement frequency during day hours (8 AM - 8 PM) (peak hours?🤔)
        if 8 <= current_hour <= 20:
            weights = [
                weight * self.time_based_multipliers.get("engagement_day_multiplier", 1.5) if task["name"] in ("reply-to-tweet", "like-tweet")
                else weight
                for weight, task in zip(weights, self.tasks)
            ]
        
        return weights

    def prompt_llm(self, prompt: str, system_prompt: str = None) -> str:
        """Generate text using the configured LLM provider"""
        system_prompt = system_prompt or self._construct_system_prompt()

        return self.connection_manager.perform_action(
            connection_name=self.model_provider,
            action_name="generate-text",
            params=[prompt, system_prompt]
        )

    def perform_action(self, connection: str, action: str, **kwargs) -> None:
        return self.connection_manager.perform_action(connection, action, **kwargs)
    
    def select_action(self, use_time_based_weights: bool = False) -> dict:
        task_weights = [weight for weight in self.task_weights.copy()]
        
        if use_time_based_weights:
            current_hour = datetime.now().hour
            task_weights = self._adjust_weights_for_time(current_hour, task_weights)
        
        return random.choices(self.tasks, weights=task_weights, k=1)[0]

    def loop(self):
        """Main agent loop for autonomous behavior"""
        if not self.is_llm_set:
            self._setup_llm_provider()

        logger.info("\n🚀 Starting agent loop...")
        logger.info("Press Ctrl+C at any time to stop the loop.")
        print_h_bar()

        time.sleep(2)
        logger.info("Starting loop in 5 seconds...")
        for i in range(5, 0, -1):
            logger.info(f"{i}...")
            time.sleep(1)

        try:
            while True:
                success = False
                try:
                    logger.info("\n👀 Trying swapping")
                    self.state["timeline_swaps"] = self.connection_manager.perform_action(
                        connection_name="sonic",
                        action_name="get-balance",
                        params=["0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"]
                    )
                    # self.state["timeline_swaps"] = self.connection_manager.perform_action(
                    #     connection_name="goat",
                    #     action_name="get_qote",
                    #     params=["0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", 137, "1000000", "EXACT_INPUT", ["V3"], "CLASSIC"]
                    # )


                    
                    action = self.select_action(use_time_based_weights=self.use_time_based_weights)
                    action_name = action["name"]

                    # PERFORM ACTION
                    success = execute_action(self, action_name)

                    logger.info(f"\n⏳ Waiting {self.loop_delay} seconds before next loop...")
                    print_h_bar()
                    time.sleep(self.loop_delay if success else 60)

                except Exception as e:
                    logger.error(f"\n❌ Error in agent loop iteration: {e}")
                    logger.info(f"⏳ Waiting {self.loop_delay} seconds before retrying...")
                    time.sleep(self.loop_delay)

        except KeyboardInterrupt:
            logger.info("\n🛑 Agent loop stopped by user.")
            return