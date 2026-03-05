package dev.sim0n.app;

import dev.sim0n.app.test.TestRepository;
import dev.sim0n.app.test.factory.SimpleTestRepositoryFactory;

public class Application {
  private final TestRepository testRepository = SimpleTestRepositoryFactory.INSTANCE.build();

  public void run() {
    System.out.println("Starting application...");

    if (fibRecursion(9) == 34) {
      this.testRepository.run();
    } else {
      throw new IllegalStateException("Fibonacci sequence is incorrect!");
    }

    System.out.println("Successfully passed every test!");
  }

  public int fibRecursion(int n) {

    if (n <= 1) {
      return n;
    }

    if (n == 2) {
      return 1;
    }

    return fibRecursion(n - 1) + fibRecursion(n - 2);
  }
}
