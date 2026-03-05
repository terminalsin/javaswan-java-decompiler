package codes.som.oof4j.fizzbuzz.enterprise.results.internal;

import java.util.Iterator;
import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResult;
import java.util.concurrent.CopyOnWriteArrayList;
import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultSubscriber;
import java.util.List;
import codes.som.oof4j.fizzbuzz.enterprise.results.FizzBuzzResultPublisher;

public abstract class AbstractFizzBuzzResultPublisherImpl implements FizzBuzzResultPublisher {
  private final List<FizzBuzzResultSubscriber> subscribers;

  public AbstractFizzBuzzResultPublisherImpl() {
    this.subscribers = new CopyOnWriteArrayList<FizzBuzzResultSubscriber>();
  }

  @Override
  public void registerSubscriber(final FizzBuzzResultSubscriber subscriber) {
    this.subscribers.add(subscriber);
  }

  @Override
  public void unregisterSubscriber(final FizzBuzzResultSubscriber subscriber) {
    this.subscribers.remove(subscriber);
  }

  protected void publishResult(final FizzBuzzResult result) {
    for (final FizzBuzzResultSubscriber subscriber : this.subscribers) {
      subscriber.onResult(result);
    }
  }
}
