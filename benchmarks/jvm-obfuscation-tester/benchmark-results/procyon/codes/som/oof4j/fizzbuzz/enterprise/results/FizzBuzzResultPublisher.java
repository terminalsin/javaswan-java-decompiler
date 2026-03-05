package codes.som.oof4j.fizzbuzz.enterprise.results;

public interface FizzBuzzResultPublisher {
  void registerSubscriber(final FizzBuzzResultSubscriber p0);

  void unregisterSubscriber(final FizzBuzzResultSubscriber p0);
}
