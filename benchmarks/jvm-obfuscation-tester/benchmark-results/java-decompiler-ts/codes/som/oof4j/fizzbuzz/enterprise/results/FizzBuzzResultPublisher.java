package codes.som.oof4j.fizzbuzz.enterprise.results;

public interface FizzBuzzResultPublisher {
  abstract void registerSubscriber(FizzBuzzResultSubscriber arg0);

  abstract void unregisterSubscriber(FizzBuzzResultSubscriber arg0);
}
