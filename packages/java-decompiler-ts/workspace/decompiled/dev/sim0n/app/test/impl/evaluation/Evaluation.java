package dev.sim0n.app.test.impl.evaluation;

import java.util.function.Consumer;

public class Evaluation<T extends Number> {
  private final T first;
  private final T second;
  private final Consumer<T> evaluator;
  
  public T getFirst() {
    return this.first;
  }
  
  public T getSecond() {
    return this.second;
  }
  
  public Consumer<T> getEvaluator() {
    return this.evaluator;
  }
  
  public Evaluation(T first, T second, Consumer<T> evaluator) {
    this.first = first;
    this.second = second;
    this.evaluator = evaluator;
  }
}