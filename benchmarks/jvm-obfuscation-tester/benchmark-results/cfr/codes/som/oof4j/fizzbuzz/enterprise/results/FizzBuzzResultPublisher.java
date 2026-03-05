package codes.som.oof4j.fizzbuzz.enterprise.results;

import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultSubscriber;

public interface FizzBuzzResultPublisher {
  public void registerSubscriber(FizzBuzzResultSubscriber var1);

  public void unregisterSubscriber(FizzBuzzResultSubscriber var1);
}
