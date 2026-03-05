package dev.sim0n.app.test.impl.evaluation;

public class Evaluation {
  private final Number first;
  private final Number second;
  private final java.util.function.Consumer evaluator;
  
  public Number getFirst() {
    return this.first;
  }
  
  public Number getSecond() {
    return this.second;
  }
  
  public java.util.function.Consumer getEvaluator() {
    return this.evaluator;
  }
  
  public Evaluation(Number first, Number second, java.util.function.Consumer evaluator) {
    this.first = first;
    this.second = second;
    this.evaluator = evaluator;
  }
}