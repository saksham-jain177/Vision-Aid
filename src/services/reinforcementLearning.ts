// Reinforcement Learning Service for Traffic Signal Optimization
// Implements Q-Learning and DQN algorithms for intelligent traffic management

export interface TrafficState {
  vehicleCounts: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  waitingTimes: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  currentPhase: 'north-south' | 'east-west';
  phaseDuration: number;
  congestionLevel: number;
}

export interface Action {
  type: 'extend_green' | 'switch_phase' | 'maintain_current';
  duration: number;
  direction: 'north-south' | 'east-west';
}

export interface QLearningConfig {
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
  maxIterations: number;
}

export class QLearningAgent {
  private qTable: Map<string, Map<string, number>>;
  private config: QLearningConfig;
  private episode: number = 0;

  constructor(config: QLearningConfig) {
    this.config = config;
    this.qTable = new Map();
  }

  // Convert traffic state to string key for Q-table lookup
  private stateToKey(state: TrafficState): string {
    const vehicleCounts = Object.values(state.vehicleCounts).join(',');
    const waitingTimes = Object.values(state.waitingTimes).join(',');
    const congestionLevel = Math.floor(state.congestionLevel / 10) * 10; // Discretize congestion
    const phaseDuration = Math.floor(state.phaseDuration / 5) * 5; // Discretize phase duration
    
    return `${vehicleCounts}|${waitingTimes}|${state.currentPhase}|${congestionLevel}|${phaseDuration}`;
  }

  // Get available actions for current state
  private getAvailableActions(state: TrafficState): Action[] {
    const actions: Action[] = [];
    
    // Always can maintain current phase
    actions.push({
      type: 'maintain_current',
      duration: 5,
      direction: state.currentPhase
    });

    // Can extend green if current phase has been active for less than 30 seconds
    if (state.phaseDuration < 30) {
      actions.push({
        type: 'extend_green',
        duration: 10,
        direction: state.currentPhase
      });
    }

    // Can switch phase if current phase has been active for at least 10 seconds
    if (state.phaseDuration >= 10) {
      const newPhase = state.currentPhase === 'north-south' ? 'east-west' : 'north-south';
      actions.push({
        type: 'switch_phase',
        duration: 5,
        direction: newPhase
      });
    }

    return actions;
  }

  // Epsilon-greedy action selection
  private selectAction(state: TrafficState): Action {
    const stateKey = this.stateToKey(state);
    const availableActions = this.getAvailableActions(state);
    
    // Initialize Q-values for this state if not exists
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }

    const stateQValues = this.qTable.get(stateKey)!;

    // Epsilon-greedy selection
    if (Math.random() < this.config.epsilon) {
      // Explore: random action
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // Exploit: best action
      let bestAction = availableActions[0];
      let bestQValue = stateQValues.get(JSON.stringify(bestAction)) || 0;

      for (const action of availableActions) {
        const actionKey = JSON.stringify(action);
        const qValue = stateQValues.get(actionKey) || 0;
        
        if (qValue > bestQValue) {
          bestQValue = qValue;
          bestAction = action;
        }
      }

      return bestAction;
    }
  }

  // Calculate reward based on traffic efficiency
  private calculateReward(state: TrafficState, action: Action, nextState: TrafficState): number {
    let reward = 0;

    // Reward for reducing waiting times
    const totalWaitingTime = Object.values(state.waitingTimes).reduce((sum, time) => sum + time, 0);
    const nextTotalWaitingTime = Object.values(nextState.waitingTimes).reduce((sum, time) => sum + time, 0);
    const waitingTimeReduction = totalWaitingTime - nextTotalWaitingTime;
    reward += waitingTimeReduction * 0.1;

    // Reward for reducing congestion
    const congestionReduction = state.congestionLevel - nextState.congestionLevel;
    reward += congestionReduction * 0.2;

    // Penalty for frequent phase switching
    if (action.type === 'switch_phase') {
      reward -= 0.1;
    }

    // Reward for efficient phase management
    if (action.type === 'extend_green' && state.phaseDuration > 15) {
      const vehicleCount = state.currentPhase === 'north-south' 
        ? state.vehicleCounts.north + state.vehicleCounts.south
        : state.vehicleCounts.east + state.vehicleCounts.west;
      
      if (vehicleCount > 3) {
        reward += 0.3; // Reward extending green when many vehicles are waiting
      }
    }

    // Penalty for excessive waiting
    const maxWaitingTime = Math.max(...Object.values(state.waitingTimes));
    if (maxWaitingTime > 20) {
      reward -= 0.5;
    }

    return reward;
  }

  // Update Q-value using Q-learning formula
  private updateQValue(state: TrafficState, action: Action, reward: number, nextState: TrafficState): void {
    const stateKey = this.stateToKey(state);
    const actionKey = JSON.stringify(action);
    const nextStateKey = this.stateToKey(nextState);

    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }

    const stateQValues = this.qTable.get(stateKey)!;
    const currentQValue = stateQValues.get(actionKey) || 0;

    // Find max Q-value for next state
    let maxNextQValue = 0;
    if (this.qTable.has(nextStateKey)) {
      const nextStateQValues = this.qTable.get(nextStateKey)!;
      for (const qValue of nextStateQValues.values()) {
        maxNextQValue = Math.max(maxNextQValue, qValue);
      }
    }

    // Q-learning update formula
    const newQValue = currentQValue + this.config.learningRate * 
      (reward + this.config.discountFactor * maxNextQValue - currentQValue);

    stateQValues.set(actionKey, newQValue);
  }

  // Main decision-making method
  public getAction(state: TrafficState): Action {
    const action = this.selectAction(state);
    
    // Decay epsilon
    this.config.epsilon = Math.max(
      this.config.minEpsilon,
      this.config.epsilon * this.config.epsilonDecay
    );

    return action;
  }

  // Train the agent with experience
  public train(state: TrafficState, action: Action, reward: number, nextState: TrafficState): void {
    this.updateQValue(state, action, reward, nextState);
    this.episode++;
  }

  // Get Q-value for debugging
  public getQValue(state: TrafficState, action: Action): number {
    const stateKey = this.stateToKey(state);
    const actionKey = JSON.stringify(action);
    
    if (!this.qTable.has(stateKey)) {
      return 0;
    }

    return this.qTable.get(stateKey)!.get(actionKey) || 0;
  }

  // Get training statistics
  public getTrainingStats() {
    return {
      episode: this.episode,
      epsilon: this.config.epsilon,
      qTableSize: this.qTable.size,
      totalQValues: Array.from(this.qTable.values()).reduce((sum, stateQ) => sum + stateQ.size, 0)
    };
  }

  // Reset agent for new training session
  public reset(): void {
    this.qTable.clear();
    this.episode = 0;
    this.config.epsilon = 0.9; // Reset epsilon to initial value
  }
}

// Deep Q-Network (DQN) implementation using TensorFlow.js
export class DQNAgent {
  private model: any;
  private targetModel: any;
  private memory: Array<{
    state: TrafficState;
    action: Action;
    reward: number;
    nextState: TrafficState;
    done: boolean;
  }> = [];
  private config: QLearningConfig;
  private episode: number = 0;

  constructor(config: QLearningConfig) {
    this.config = config;
    this.initializeModels();
  }

  // Initialize neural network models
  private async initializeModels() {
    // This would use TensorFlow.js to create the neural network
    // For now, we'll use a simplified approach
    console.log('DQN models initialized');
  }

  // Convert state to neural network input
  private stateToVector(state: TrafficState): number[] {
    return [
      state.vehicleCounts.north / 20, // Normalize vehicle counts
      state.vehicleCounts.south / 20,
      state.vehicleCounts.east / 20,
      state.vehicleCounts.west / 20,
      state.waitingTimes.north / 30, // Normalize waiting times
      state.waitingTimes.south / 30,
      state.waitingTimes.east / 30,
      state.waitingTimes.west / 30,
      state.currentPhase === 'north-south' ? 1 : 0, // One-hot encoding
      state.phaseDuration / 60, // Normalize phase duration
      state.congestionLevel / 100 // Normalize congestion level
    ];
  }

  // Get action using neural network
  public async getAction(state: TrafficState): Promise<Action> {
    // Simplified implementation - in real DQN, this would use the neural network
    const availableActions = this.getAvailableActions(state);
    
    if (Math.random() < this.config.epsilon) {
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // For now, use simple heuristic
      return this.getHeuristicAction(state, availableActions);
    }
  }

  // Get available actions (same as Q-learning)
  private getAvailableActions(state: TrafficState): Action[] {
    const actions: Action[] = [];
    
    actions.push({
      type: 'maintain_current',
      duration: 5,
      direction: state.currentPhase
    });

    if (state.phaseDuration < 30) {
      actions.push({
        type: 'extend_green',
        duration: 10,
        direction: state.currentPhase
      });
    }

    if (state.phaseDuration >= 10) {
      const newPhase = state.currentPhase === 'north-south' ? 'east-west' : 'north-south';
      actions.push({
        type: 'switch_phase',
        duration: 5,
        direction: newPhase
      });
    }

    return actions;
  }

  // Heuristic action selection (placeholder for neural network)
  private getHeuristicAction(state: TrafficState, actions: Action[]): Action {
    const vehicleCount = state.currentPhase === 'north-south' 
      ? state.vehicleCounts.north + state.vehicleCounts.south
      : state.vehicleCounts.east + state.vehicleCounts.west;

    const waitingTime = state.currentPhase === 'north-south'
      ? Math.max(state.waitingTimes.north, state.waitingTimes.south)
      : Math.max(state.waitingTimes.east, state.waitingTimes.west);

    // If many vehicles waiting and phase has been active for a while, extend green
    if (vehicleCount > 5 && state.phaseDuration > 15 && state.phaseDuration < 25) {
      const extendAction = actions.find(a => a.type === 'extend_green');
      if (extendAction) return extendAction;
    }

    // If waiting time is high and phase has been active long enough, switch
    if (waitingTime > 15 && state.phaseDuration >= 15) {
      const switchAction = actions.find(a => a.type === 'switch_phase');
      if (switchAction) return switchAction;
    }

    // Default to maintaining current phase
    return actions.find(a => a.type === 'maintain_current') || actions[0];
  }

  // Store experience in replay memory
  public storeExperience(
    state: TrafficState,
    action: Action,
    reward: number,
    nextState: TrafficState,
    done: boolean
  ): void {
    this.memory.push({ state, action, reward, nextState, done });
    
    // Limit memory size
    if (this.memory.length > 10000) {
      this.memory.shift();
    }
  }

  // Train the neural network
  public async train(): Promise<void> {
    if (this.memory.length < 32) return;

    // Sample batch from memory
    const batch = this.memory.slice(-32);
    
    // Simplified training - in real DQN, this would train the neural network
    console.log(`Training DQN with batch of ${batch.length} experiences`);
    
    this.episode++;
  }

  // Get training statistics
  public getTrainingStats() {
    return {
      episode: this.episode,
      epsilon: this.config.epsilon,
      memorySize: this.memory.length
    };
  }
}

// Factory function to create RL agents
export function createRLAgent(type: 'qlearning' | 'dqn', config: QLearningConfig) {
  switch (type) {
    case 'qlearning':
      return new QLearningAgent(config);
    case 'dqn':
      return new DQNAgent(config);
    default:
      throw new Error(`Unknown RL agent type: ${type}`);
  }
}

// Default configuration
export const defaultRLConfig: QLearningConfig = {
  learningRate: 0.1,
  discountFactor: 0.9,
  epsilon: 0.9,
  epsilonDecay: 0.995,
  minEpsilon: 0.01,
  maxIterations: 1000
};
